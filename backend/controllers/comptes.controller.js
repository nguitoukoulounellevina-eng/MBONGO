const pool = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { mois, annee } = req.query;
    let reserveSubQuery = 'SELECT SUM(bc.montant_preleve) FROM budgets_comptes bc WHERE bc.compte_id = c.id';
    const params = [];
    if (mois && annee) {
      reserveSubQuery += ' AND EXISTS (SELECT 1 FROM budgets b WHERE b.id = bc.budget_id AND b.mois = ? AND b.annee = ?)';
      params.push(parseInt(mois), parseInt(annee));
    }
    params.push(req.utilisateurId);
    const [rows] = await pool.query(
      `SELECT c.*,
              COALESCE((${reserveSubQuery}), 0) AS reserve
       FROM comptes c
       WHERE c.utilisateur_id = ?
       ORDER BY c.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM comptes WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Compte introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { nom_compte, type_compte, solde_initial, devise, type_personnalise } = req.body;
    if (!nom_compte || !nom_compte.trim()) {
      return res.status(400).json({ message: 'Le nom du compte est requis.' });
    }
    if (!type_compte) {
      return res.status(400).json({ message: 'Le type de compte est requis.' });
    }
    if (type_compte === 'autre' && (!type_personnalise || !type_personnalise.trim())) {
      return res.status(400).json({ message: 'Veuillez préciser le type de compte.' });
    }
    if (solde_initial !== undefined && (isNaN(solde_initial) || Number(solde_initial) < 0)) {
      return res.status(400).json({ message: 'Le solde initial est invalide.' });
    }
    const [result] = await pool.query(
      'INSERT INTO comptes (utilisateur_id, nom_compte, type_compte, type_personnalise, solde_initial, solde_actuel, devise) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.utilisateurId, nom_compte, type_compte, type_personnalise || null, solde_initial || 0, solde_initial || 0, devise || 'XAF']
    );
    const [rows] = await pool.query('SELECT * FROM comptes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { nom_compte, type_compte, devise, type_personnalise } = req.body;
    if (!nom_compte || !nom_compte.trim()) {
      return res.status(400).json({ message: 'Le nom du compte est requis.' });
    }
    if (type_compte === 'autre' && (!type_personnalise || !type_personnalise.trim())) {
      return res.status(400).json({ message: 'Veuillez préciser le type de compte.' });
    }
    await pool.query(
      'UPDATE comptes SET nom_compte = ?, type_compte = ?, type_personnalise = ?, devise = ? WHERE id = ? AND utilisateur_id = ?',
      [nom_compte, type_compte, type_personnalise || null, devise, req.params.id, req.utilisateurId]
    );
    const [rows] = await pool.query('SELECT * FROM comptes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Compte introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      'DELETE FROM depenses WHERE compte_id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    await conn.query(
      'DELETE FROM revenus WHERE compte_id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );

    const [result] = await conn.query(
      'DELETE FROM comptes WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Compte introuvable.' });
    }

    await conn.commit();
    res.json({ message: 'Compte et transactions supprimés.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
