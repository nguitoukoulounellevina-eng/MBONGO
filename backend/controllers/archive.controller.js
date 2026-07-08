const pool = require('../config/database');
const { getSummary } = require('../services/financeSummary.service');

const Period = require('../utils/period');

exports.getPeriods = async (req, res, next) => {
  try {
    const periodType = req.query.periode_type || req.period?.type || 'mensuel';
    const dateFmt = periodType === 'quotidien' ? '%Y-%m-%d' : '%Y-%m-%d';
    const groupKey = periodType === 'mensuel' ? 7 : periodType === 'hebdomadaire' ? 10 : 10;

    const queries = [
      `SELECT DISTINCT DATE_FORMAT(date_revenu, '%Y-%m-%d') AS debut FROM revenus WHERE utilisateur_id = ?`,
      `SELECT DISTINCT DATE_FORMAT(date_depense, '%Y-%m-%d') AS debut FROM depenses WHERE utilisateur_id = ?`,
      `SELECT DISTINCT DATE_FORMAT(date_debut, '%Y-%m-%d') AS debut FROM budgets WHERE utilisateur_id = ? AND date_debut IS NOT NULL`,
      `SELECT DISTINCT DATE_FORMAT(date_debut, '%Y-%m-%d') AS debut FROM analyses_ia WHERE utilisateur_id = ? AND date_debut IS NOT NULL`,
    ];

    const allRows = await Promise.all(queries.map(q => pool.query(q, [req.utilisateurId])));
    const periodSet = new Set();
    for (const [rows] of allRows) {
      for (const r of rows) {
        if (r.debut) {
          const key = periodType === 'mensuel' ? r.debut.slice(0, 7) : r.debut;
          periodSet.add(key);
        }
      }
    }

    const periods = Array.from(periodSet).sort().reverse().map((key) => {
      if (periodType === 'mensuel') {
        const [annee, mois] = key.split('-').map(Number);
        const svc = new Period('mensuel', new Date(annee, mois - 1, 1));
        return { annee, mois, debut: svc.current.debut, fin: svc.current.fin, label: svc.label, id: svc.current.id };
      }
      const svc = new Period(periodType, new Date(key));
      return { debut: svc.current.debut, fin: svc.current.fin, label: svc.label, id: svc.current.id };
    });

    res.json(periods);
  } catch (err) { next(err); }
};

exports.getMonthSummary = async (req, res, next) => {
  try {
    let debut, fin;
    if (req.query.debut && req.query.fin) {
      debut = req.query.debut;
      fin = req.query.fin;
    } else {
      const mois = parseInt(req.query.mois);
      const annee = parseInt(req.query.annee);
      if (!mois || !annee) {
        return res.status(400).json({ message: 'Paramètres mois et annee, ou debut et fin requis.' });
      }
      debut = `${annee}-${String(mois).padStart(2, '0')}-01`;
      fin = new Date(annee, mois, 0).toISOString().split('T')[0];
    }

    const summary = await getSummary(req.utilisateurId, debut, fin);

    let analyse = null;
    const [analyseRows] = await pool.query(
      'SELECT * FROM analyses_ia WHERE utilisateur_id = ? AND date_debut = ? AND date_fin = ? ORDER BY created_at DESC LIMIT 1',
      [req.utilisateurId, debut, fin]
    );
    if (analyseRows.length > 0) {
      analyse = analyseRows[0];
      analyse.recommandations = typeof analyse.recommandations === 'string'
        ? JSON.parse(analyse.recommandations) : analyse.recommandations;
    }

    const [objectifs] = await pool.query(
      `SELECT * FROM objectifs_epargne WHERE utilisateur_id = ? AND date_limite IS NOT NULL AND date_limite BETWEEN ? AND ? ORDER BY date_limite DESC`,
      [req.utilisateurId, debut, fin]
    );

    const [revenus] = await pool.query(
      `SELECT r.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone
       FROM revenus r LEFT JOIN categories c ON r.categorie_id = c.id
       WHERE r.utilisateur_id = ? AND r.date_revenu BETWEEN ? AND ?
       ORDER BY r.date_revenu DESC`,
      [req.utilisateurId, debut, fin]
    );

    const [depenses] = await pool.query(
      `SELECT d.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone
       FROM depenses d LEFT JOIN categories c ON d.categorie_id = c.id
       WHERE d.utilisateur_id = ? AND d.date_depense BETWEEN ? AND ?
       ORDER BY d.date_depense DESC`,
      [req.utilisateurId, debut, fin]
    );

    const [budgets] = await pool.query(
      `SELECT b.*, MONTH(b.date_debut) AS mois, YEAR(b.date_debut) AS annee, c.libelle AS categorie_libelle, c.icone AS categorie_icone
       FROM budgets b LEFT JOIN categories c ON b.categorie_id = c.id
        WHERE b.utilisateur_id = ? AND b.date_debut <= ? AND b.date_fin >= ?`,
      [req.utilisateurId, fin, debut]
    );

    res.json({
      resume: summary,
      analyse,
      objectifs,
      revenus,
      depenses,
      budgets,
    });
  } catch (err) { next(err); }
};

module.exports = exports;
