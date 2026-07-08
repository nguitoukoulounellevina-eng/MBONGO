const pool = require('../config/database');
const Period = require('../utils/period');

function getPeriod(req) {
  if (req.query.debut && req.query.fin) {
    return { debut: req.query.debut, fin: req.query.fin };
  }
  if (req.query.mois && req.query.annee) {
    const { mois, annee } = req.query;
    return {
      debut: `${annee}-${String(mois).padStart(2, '0')}-01`,
      fin: new Date(parseInt(annee), parseInt(mois), 0).toISOString().split('T')[0],
    };
  }
  return req.period.current;
}

exports.getAll = async (req, res, next) => {
  try {
    const { debut, fin } = getPeriod(req);

    const periodeType = req.query.periode_type || null;

    const reserveSubquery = `(
      SELECT COALESCE(SUM(b2.montant_prevu), 0)
      FROM budgets b2
      WHERE b2.categorie_id = b.categorie_id
        AND b2.utilisateur_id = b.utilisateur_id
        AND b2.periode_type IN ('quotidien', 'hebdomadaire')
        AND b2.date_debut >= b.date_debut
        AND b2.date_fin <= b.date_fin
        AND b2.id != b.id
    )`;

    let sql = `SELECT b.*, MONTH(b.date_debut) AS mois, YEAR(b.date_debut) AS annee, c.libelle AS categorie_libelle, c.icone AS categorie_icone, c.couleur AS categorie_couleur,
               COALESCE(SUM(d.montant), 0) AS montant_depense,
               b.montant_utilise,
               CASE WHEN b.periode_type = 'quotidien' THEN GREATEST(0, b.montant_prevu - COALESCE((
                 SELECT SUM(d2.montant) FROM depenses d2
                 WHERE d2.categorie_id = b.categorie_id
                   AND d2.utilisateur_id = b.utilisateur_id
                   AND d2.date_depense = CURDATE()
               ), 0))
                    WHEN b.periode_type = 'hebdomadaire' THEN GREATEST(0, b.montant_prevu - COALESCE(${reserveSubquery}, 0))
                    ELSE GREATEST(0, b.montant_prevu - b.montant_utilise)
               END AS montant_restant,
               COALESCE(${reserveSubquery}, 0) AS montant_reserve,
               COALESCE(
                 (SELECT GROUP_CONCAT(CONCAT(bc.compte_id, ':', bc.montant_preleve, ':', COALESCE(co.nom_compte, 'Compte')) SEPARATOR '||')
                  FROM budgets_comptes bc
                  LEFT JOIN comptes co ON bc.compte_id = co.id
                  WHERE bc.budget_id = b.id),
                 ''
               ) AS comptes_allocation,
               COALESCE((
                 SELECT SUM(d2.montant) FROM depenses d2
                 WHERE d2.categorie_id = b.categorie_id
                   AND d2.utilisateur_id = b.utilisateur_id
                   AND d2.date_depense = CURDATE()
               ), 0) AS today_usage
        FROM budgets b
        LEFT JOIN categories c ON b.categorie_id = c.id
        LEFT JOIN depenses d ON d.categorie_id = b.categorie_id
          AND d.date_depense BETWEEN b.date_debut AND b.date_fin
          AND d.utilisateur_id = b.utilisateur_id
        WHERE b.utilisateur_id = ?`;
    const params = [req.utilisateurId];

    sql += ` AND b.date_debut <= ? AND b.date_fin >= ?`;
    params.push(debut, fin);

    if (periodeType && periodeType !== 'quotidien' && periodeType !== 'hebdomadaire') {
      sql += ` AND b.periode_type = ?`;
      params.push(periodeType);
    }

    sql += ` AND (b.periode_type NOT IN ('quotidien','hebdomadaire') OR b.date_fin >= CURDATE())`;

    sql += ` GROUP BY b.id ORDER BY b.date_debut DESC`;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone
       FROM budgets b
       LEFT JOIN categories c ON b.categorie_id = c.id
       WHERE b.id = ? AND b.utilisateur_id = ?`,
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Budget introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { categorie_id, montant_prevu, alerte_seuil, comptes, date_debut, date_fin, mois, annee, periode_type } = req.body;
    let period;
    const budgetPeriodeType = periode_type || (req.period?.type) || 'mensuel';
    if (date_debut && date_fin) {
      period = { debut: date_debut, fin: date_fin };
    } else if (mois && annee) {
      period = {
        debut: `${annee}-${String(mois).padStart(2, '0')}-01`,
        fin: new Date(parseInt(annee), parseInt(mois), 0).toISOString().split('T')[0],
      };
    } else {
      period = req.period.current;
    }

    const debutDate = new Date(period.debut + 'T00:00:00');
    const moisVal = debutDate.getMonth() + 1;
    const anneeVal = debutDate.getFullYear();

    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO budgets (utilisateur_id, categorie_id, montant_prevu, date_debut, date_fin, alerte_seuil, periode_type, mois, annee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.utilisateurId, categorie_id, montant_prevu, period.debut, period.fin, alerte_seuil || 80, budgetPeriodeType, moisVal, anneeVal]
    );
    const budgetId = result.insertId;

    if (comptes && comptes.length > 0) {
      for (const c of comptes) {
        if (!c.montant || c.montant <= 0) continue;
        const [[compte]] = await conn.query(
          'SELECT solde_actuel FROM comptes WHERE id = ? AND utilisateur_id = ?',
          [c.compte_id, req.utilisateurId]
        );
        if (!compte) {
          await conn.rollback();
          return res.status(404).json({ message: `Compte introuvable.` });
        }
        if (parseFloat(compte.solde_actuel) < c.montant) {
          await conn.rollback();
          return res.status(400).json({ message: `Solde insuffisant.` });
        }
        await conn.query(
          'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ?',
          [c.montant, c.compte_id]
        );
        await conn.query(
          'INSERT INTO budgets_comptes (budget_id, compte_id, montant_preleve) VALUES (?, ?, ?)',
          [budgetId, c.compte_id, c.montant]
        );
      }
    }

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM budgets WHERE id = ?', [budgetId]);
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
    const { montant_prevu, alerte_seuil, date_debut, date_fin, comptes } = req.body;

    const [oldRows] = await conn.query(
      'SELECT * FROM budgets WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (oldRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Budget introuvable.' });
    }

    await conn.beginTransaction();

    const [oldComptes] = await conn.query(
      'SELECT * FROM budgets_comptes WHERE budget_id = ?',
      [req.params.id]
    );

    for (const oc of oldComptes) {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel + ? WHERE id = ?',
        [oc.montant_preleve, oc.compte_id]
      );
    }

    await conn.query(
      'DELETE FROM budgets_comptes WHERE budget_id = ?',
      [req.params.id]
    );

    let sqlUpdate = 'UPDATE budgets SET montant_prevu = ?, alerte_seuil = ?';
    const params = [montant_prevu, alerte_seuil || 80];
    if (date_debut && date_fin) {
      sqlUpdate += ', date_debut = ?, date_fin = ?';
      params.push(date_debut, date_fin);
    }
    sqlUpdate += ' WHERE id = ?';
    params.push(req.params.id);
    await conn.query(sqlUpdate, params);

    if (comptes && comptes.length > 0) {
      for (const c of comptes) {
        if (!c.montant || c.montant <= 0) continue;
        const [[compte]] = await conn.query(
          'SELECT solde_actuel FROM comptes WHERE id = ? AND utilisateur_id = ?',
          [c.compte_id, req.utilisateurId]
        );
        if (!compte) {
          await conn.rollback();
          return res.status(404).json({ message: `Compte introuvable.` });
        }
        if (parseFloat(compte.solde_actuel) < c.montant) {
          await conn.rollback();
          return res.status(400).json({ message: `Solde insuffisant.` });
        }
        await conn.query(
          'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ?',
          [c.montant, c.compte_id]
        );
        await conn.query(
          'INSERT INTO budgets_comptes (budget_id, compte_id, montant_preleve) VALUES (?, ?, ?)',
          [req.params.id, c.compte_id, c.montant]
        );
      }
    } else if (oldComptes.length > 0) {
      const oldTotal = oldComptes.reduce((s, oc) => s + parseFloat(oc.montant_preleve), 0);
      for (const oc of oldComptes) {
        const proportion = parseFloat(oc.montant_preleve) / oldTotal;
        const newMontant = Math.round(montant_prevu * proportion * 100) / 100;
        if (newMontant > 0) {
          const [[compte]] = await conn.query(
            'SELECT solde_actuel FROM comptes WHERE id = ? AND utilisateur_id = ?',
            [oc.compte_id, req.utilisateurId]
          );
          if (compte && parseFloat(compte.solde_actuel) < newMontant) {
            await conn.rollback();
            return res.status(400).json({ message: `Solde insuffisant.` });
          }
          await conn.query(
            'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ?',
            [newMontant, oc.compte_id]
          );
          await conn.query(
            'INSERT INTO budgets_comptes (budget_id, compte_id, montant_preleve) VALUES (?, ?, ?)',
            [req.params.id, oc.compte_id, newMontant]
          );
        }
      }
    }

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM budgets WHERE id = ?', [req.params.id]);
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
    const [oldRows] = await conn.query(
      'SELECT * FROM budgets WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (oldRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Budget introuvable.' });
    }

    await conn.beginTransaction();

    const [budgetComptes] = await conn.query(
      'SELECT * FROM budgets_comptes WHERE budget_id = ?',
      [req.params.id]
    );

    for (const bc of budgetComptes) {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel + ? WHERE id = ?',
        [bc.montant_preleve, bc.compte_id]
      );
    }

    await conn.query(
      'DELETE FROM budgets_comptes WHERE budget_id = ?',
      [req.params.id]
    );

    await conn.query(
      'DELETE FROM budgets WHERE id = ?',
      [req.params.id]
    );

    await conn.commit();
    res.json({ message: 'Budget supprimé et comptes remboursés.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
