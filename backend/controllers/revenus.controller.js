const pool = require('../config/database');

function formatLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPeriod(req) {
  if (req.query.debut && req.query.fin) {
    return { debut: req.query.debut, fin: req.query.fin };
  }
  if (req.query.mois && req.query.annee) {
    const { mois, annee } = req.query;
    return {
      debut: `${annee}-${String(mois).padStart(2, '0')}-01`,
      fin: formatLocalDate(new Date(parseInt(annee), parseInt(mois), 0)),
    };
  }
  return req.period.current;
}

exports.getAll = async (req, res, next) => {
  try {
    const period = getPeriod(req);

    let query = `SELECT r.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone, c.couleur AS categorie_couleur,
                       co.nom_compte, co.type_compte
                FROM revenus r
                LEFT JOIN categories c ON r.categorie_id = c.id
                LEFT JOIN comptes co ON r.compte_id = co.id
                WHERE r.utilisateur_id = ? AND r.date_revenu BETWEEN ? AND ?`;
    const params = [req.utilisateurId, period.debut, period.fin];

    query += ` ORDER BY r.date_revenu DESC, r.id DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone,
              co.nom_compte, co.type_compte
       FROM revenus r
       LEFT JOIN categories c ON r.categorie_id = c.id
       LEFT JOIN comptes co ON r.compte_id = co.id
       WHERE r.id = ? AND r.utilisateur_id = ?`,
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Revenu introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { compte_id, categorie_id, libelle, montant, date_revenu, recurrent, frequence, notes } = req.body;

    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO revenus (utilisateur_id, compte_id, categorie_id, libelle, montant, date_revenu, recurrent, frequence, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.utilisateurId, compte_id, categorie_id || null, libelle, montant, date_revenu, recurrent || 0, frequence || 'unique', notes || null]
    );

    await conn.query(
      'UPDATE comptes SET solde_actuel = solde_actuel + ? WHERE id = ? AND utilisateur_id = ?',
      [montant, compte_id, req.utilisateurId]
    );

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM revenus WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.update = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { compte_id, categorie_id, libelle, montant, date_revenu, recurrent, frequence, notes } = req.body;

    const [old] = await conn.query(
      'SELECT id, montant, compte_id FROM revenus WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (old.length === 0) return res.status(404).json({ message: 'Revenu introuvable.' });

    const oldMontant = old[0].montant;
    const oldCompteId = old[0].compte_id;

    await conn.beginTransaction();

    await conn.query(
      'UPDATE revenus SET compte_id = ?, categorie_id = ?, libelle = ?, montant = ?, date_revenu = ?, recurrent = ?, frequence = ?, notes = ? WHERE id = ? AND utilisateur_id = ?',
      [compte_id, categorie_id || null, libelle, montant, date_revenu, recurrent || 0, frequence || 'unique', notes || null, req.params.id, req.utilisateurId]
    );

    if (oldCompteId === compte_id) {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel - ? + ? WHERE id = ? AND utilisateur_id = ?',
        [oldMontant, montant, compte_id, req.utilisateurId]
      );
    } else {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ? AND utilisateur_id = ?',
        [oldMontant, oldCompteId, req.utilisateurId]
      );
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel + ? WHERE id = ? AND utilisateur_id = ?',
        [montant, compte_id, req.utilisateurId]
      );
    }

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM revenus WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.remove = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [old] = await conn.query(
      'SELECT id, montant, compte_id FROM revenus WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (old.length === 0) return res.status(404).json({ message: 'Revenu introuvable.' });

    await conn.beginTransaction();

    await conn.query('DELETE FROM revenus WHERE id = ?', [req.params.id]);

    await conn.query(
      'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ? AND utilisateur_id = ?',
      [old[0].montant, old[0].compte_id, req.utilisateurId]
    );

    await conn.commit();
    res.json({ message: 'Revenu supprimé.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
