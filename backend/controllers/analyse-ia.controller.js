const pool = require('../config/database');
const { analyserComplet } = require('../services/analyse.service');
const { creerAlertesDepuisAnalyse } = require('../services/notification.service');
const Period = require('../utils/period');

function getPeriod(req) {
  if (req.query.mois && req.query.annee) {
    const d = new Date(parseInt(req.query.annee), parseInt(req.query.mois) - 1, 1);
    return new Period('mensuel', d);
  }
  return req.period;
}

exports.getDerniere = async (req, res, next) => {
  try {
    const period = getPeriod(req);
    const { debut, fin } = period.current;

    let [rows] = await pool.query(
      'SELECT * FROM analyses_ia WHERE utilisateur_id = ? AND date_debut = ? AND date_fin = ? ORDER BY created_at DESC LIMIT 1',
      [req.utilisateurId, debut, fin]
    );

    if (rows.length === 0) {
      [rows] = await pool.query(
        'SELECT * FROM analyses_ia WHERE utilisateur_id = ? ORDER BY created_at DESC LIMIT 1',
        [req.utilisateurId]
      );
    }

    if (rows.length === 0) {
      return res.json(null);
    }

    const analyse = rows[0];
    analyse.recommandations = typeof analyse.recommandations === 'string'
      ? JSON.parse(analyse.recommandations) : analyse.recommandations;
    analyse.previsions = typeof analyse.previsions === 'string'
      ? JSON.parse(analyse.previsions) : analyse.previsions;

    res.json(analyse);
  } catch (err) { next(err); }
};

exports.generer = async (req, res, next) => {
  try {
    const period = getPeriod(req);
    const { debut, fin } = period.current;

    const [[revenus]] = await pool.query(
      'SELECT COALESCE(SUM(montant), 0) AS total FROM revenus WHERE utilisateur_id = ? AND date_revenu BETWEEN ? AND ?',
      [req.utilisateurId, debut, fin]
    );

    const [[depenses]] = await pool.query(
      'SELECT COALESCE(SUM(montant), 0) AS total FROM depenses WHERE utilisateur_id = ? AND date_depense BETWEEN ? AND ?',
      [req.utilisateurId, debut, fin]
    );

    const totalRevenus = parseFloat(revenus.total);
    const totalDepenses = parseFloat(depenses.total);
    const tauxEpargne = totalRevenus > 0 ? ((totalRevenus - totalDepenses) / totalRevenus * 100) : 0;
    const scoreFinancier = Math.min(100, Math.max(0, Math.round(
      (tauxEpargne * 0.4) +
      ((totalRevenus > 0 ? 1 : 0) * 20) +
      ((totalDepenses / (totalRevenus || 1)) < 0.8 ? 20 : 0) +
      20
    )));

    const recommandations = [];
    if (tauxEpargne < 20) {
      recommandations.push({ ico: '🏦', titre: 'Augmenter l\'épargne', desc: `Votre taux d'épargne est de ${tauxEpargne.toFixed(1)}%. Essayez d'atteindre au moins 20%.` });
    }
    if (totalDepenses > totalRevenus * 0.8) {
      recommandations.push({ ico: '⚠️', titre: 'Réduire les dépenses', desc: 'Vous dépensez plus de 80% de vos revenus. Essayez de réduire certaines catégories.' });
    }

    const t = period.timeContext();
    const previsions = [];
    for (let i = 1; i <= 3; i++) {
      const label = `Période ${i}`;
      previsions.push({
        label,
        rev: Math.round(totalRevenus * (1 + i * 0.02)),
        dep: Math.round(totalDepenses * (1 + i * 0.015)),
      });
    }

    await pool.query(
      'DELETE FROM analyses_ia WHERE utilisateur_id = ? AND date_debut = ? AND date_fin = ?',
      [req.utilisateurId, debut, fin]
    );

    const [result] = await pool.query(
      'INSERT INTO analyses_ia (utilisateur_id, score_financier, taux_epargne, periode_type, date_debut, date_fin, recommandations, previsions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.utilisateurId, scoreFinancier, parseFloat(tauxEpargne.toFixed(2)), period.type, debut, fin, JSON.stringify(recommandations), JSON.stringify(previsions)]
    );

    const [rows] = await pool.query('SELECT * FROM analyses_ia WHERE id = ?', [result.insertId]);
    const analyse = rows[0];
    analyse.recommandations = recommandations;
    analyse.previsions = previsions;

    res.status(201).json(analyse);
  } catch (err) { next(err); }
};

exports.analyserComplet = async (req, res, next) => {
  try {
    const period = req.period;
    const rapport = await analyserComplet(req.utilisateurId, period);

    const notificationsCrees = await creerAlertesDepuisAnalyse(req.utilisateurId, rapport.points_attention);

    const recommandationsJson = JSON.stringify({
      score_financier: rapport.score.valeur,
      taux_epargne: rapport.resume.taux_epargne,
      rapport_complet: rapport,
    });

    const { debut, fin } = period.current;

    await pool.query(
      'DELETE FROM analyses_ia WHERE utilisateur_id = ? AND date_debut = ? AND date_fin = ?',
      [req.utilisateurId, debut, fin]
    );

    await pool.query(
      'INSERT INTO analyses_ia (utilisateur_id, score_financier, taux_epargne, periode_type, date_debut, date_fin, recommandations) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.utilisateurId, rapport.score.valeur, rapport.resume.taux_epargne, period.type, debut, fin, recommandationsJson]
    );

    res.status(201).json({
      rapport,
      notifications_crees: notificationsCrees.length,
    });
  } catch (err) { next(err); }
};

exports.getHistorique = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, score_financier, taux_epargne, periode_type, date_debut, date_fin, created_at FROM analyses_ia WHERE utilisateur_id = ? ORDER BY created_at DESC',
      [req.utilisateurId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.comparer = async (req, res, next) => {
  try {
    const periode1 = getPeriod(req);
    const periode2 = req.query.mois2
      ? new Period('mensuel', new Date(parseInt(req.query.annee2), parseInt(req.query.mois2) - 1, 1))
      : periode1.previous;

    const getPeriodData = async (period) => {
      const { debut, fin } = period.current;
      const [[rev]] = await pool.query(
        'SELECT COALESCE(SUM(montant), 0) AS total FROM revenus WHERE utilisateur_id = ? AND date_revenu BETWEEN ? AND ?',
        [req.utilisateurId, debut, fin]
      );
      const [[dep]] = await pool.query(
        'SELECT COALESCE(SUM(montant), 0) AS total FROM depenses WHERE utilisateur_id = ? AND date_depense BETWEEN ? AND ?',
        [req.utilisateurId, debut, fin]
      );
      const [analyse] = await pool.query(
        'SELECT * FROM analyses_ia WHERE utilisateur_id = ? AND date_debut = ? AND date_fin = ? ORDER BY created_at DESC LIMIT 1',
        [req.utilisateurId, debut, fin]
      );
      return {
        revenus: parseFloat(rev.total) || 0,
        depenses: parseFloat(dep.total) || 0,
        epargne: (parseFloat(rev.total) || 0) - (parseFloat(dep.total) || 0),
        analyse: analyse.length > 0 ? analyse[0] : null,
      };
    };

    const data1 = await getPeriodData(periode1);
    const data2 = await getPeriodData(periode2);

    const calcVariation = (a, b) => b > 0 ? Math.round(((a - b) / b) * 100) : 0;

    res.json({
      periode1: { ...periode1.current, ...data1 },
      periode2: { ...periode2.current, ...data2 },
      comparaison: {
        revenus_variation: calcVariation(data2.revenus, data1.revenus),
        depenses_variation: calcVariation(data2.depenses, data1.depenses),
        epargne_variation: calcVariation(data2.epargne, data1.epargne),
      },
    });
  } catch (err) { next(err); }
};
