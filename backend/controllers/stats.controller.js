const pool = require('../config/database');
const { getSummary } = require('../services/financeSummary.service');
const Period = require('../utils/period');

function periodFromQuery(req) {
  if (req.query.debut && req.query.fin) {
    const p = req.period || new Period('mensuel');
    const pt = req.query.periode_type || p.type;
    const viewedDate = new Date(req.query.debut + 'T00:00:00');
    let prev;
    if (pt === 'quotidien') {
      const d = new Date(viewedDate);
      d.setDate(d.getDate() - 1);
      prev = { debut: d.toISOString().split('T')[0], fin: d.toISOString().split('T')[0] };
    } else if (pt === 'hebdomadaire') {
      const d = new Date(viewedDate);
      d.setDate(d.getDate() - 7);
      const prevEnd = new Date(req.query.fin + 'T00:00:00');
      prevEnd.setDate(prevEnd.getDate() - 7);
      prev = { debut: d.toISOString().split('T')[0], fin: prevEnd.toISOString().split('T')[0] };
    } else {
      const prevM = viewedDate.getMonth() === 0 ? 11 : viewedDate.getMonth() - 1;
      const prevA = viewedDate.getMonth() === 0 ? viewedDate.getFullYear() - 1 : viewedDate.getFullYear();
      const pM = new Period('mensuel', new Date(prevA, prevM, 1));
      prev = pM.current;
    }
    return {
      current: { debut: req.query.debut, fin: req.query.fin },
      previous: prev,
      type: pt,
      label: p.label,
      timeContext: () => p.timeContext(),
      compareLabel: () => p.compareLabel(),
    };
  }
  if (req.query.mois && req.query.annee) {
    const d = new Date(parseInt(req.query.annee), parseInt(req.query.mois) - 1, 1);
    const p = new Period('mensuel', d);
    return p;
  }
  return req.period;
}

exports.getResume = async (req, res, next) => {
  try {
    const period = periodFromQuery(req);
    const summary = await getSummary(req.utilisateurId, period.current.debut, period.current.fin);
    const prevSummary = await getSummary(req.utilisateurId, period.previous.debut, period.previous.fin);

    const calcVar = (a, b) => b > 0 ? Math.round(((a - b) / b) * 100) : 0;

    res.json({
      revenus: summary.revenus,
      depenses: summary.depenses,
      epargne: summary.epargne,
      objectif_cible: summary.objectif_cible,
      taux_progression: summary.taux_progression,
      top_categories: summary.top_categories,
      periode: {
        label: period.label,
        timeContext: period.timeContext(),
        compareLabel: period.compareLabel(),
        current: period.current,
        previous: period.previous,
      },
      comparaison: {
        revenus: calcVar(summary.revenus, prevSummary.revenus),
        depenses: calcVar(summary.depenses, prevSummary.depenses),
        epargne: calcVar(summary.epargne, prevSummary.epargne),
      },
    });
  } catch (err) { next(err); }
};

exports.getRepartition = async (req, res, next) => {
  try {
    const period = periodFromQuery(req);

    const [rows] = await pool.query(
      `SELECT c.libelle, c.icone, c.couleur, COALESCE(SUM(d.montant), 0) AS total
       FROM depenses d
       LEFT JOIN categories c ON d.categorie_id = c.id
       WHERE d.utilisateur_id = ? AND d.date_depense BETWEEN ? AND ?
       GROUP BY d.categorie_id
       ORDER BY total DESC`,
      [req.utilisateurId, period.current.debut, period.current.fin]
    );

    const totalDepenses = rows.reduce((a, r) => a + (parseFloat(r.total) || 0), 0);

    const data = rows.map((r) => ({
      libelle: r.libelle || 'Sans catégorie',
      icone: r.icone || '📦',
      couleur: r.couleur || '#9090A8',
      montant: parseFloat(r.total) || 0,
      pourcentage: totalDepenses > 0 ? Math.round((parseFloat(r.total) / totalDepenses) * 100) : 0,
    }));

    res.json(data);
  } catch (err) { next(err); }
};

exports.getEvolution = async (req, res, next) => {
  try {
    const nbPeriods = parseInt(req.query.nb) || 6;
    const period = periodFromQuery(req);
    const type = period.type;

    const now = new Date();
    let debut;
    if (type === 'quotidien') {
      debut = new Date(now.getFullYear(), now.getMonth(), now.getDate() - nbPeriods + 1);
    } else if (type === 'hebdomadaire') {
      debut = new Date(now);
      debut.setDate(debut.getDate() - 7 * (nbPeriods - 1));
    } else {
      debut = new Date(now.getFullYear(), now.getMonth() - nbPeriods + 1, 1);
    }
    const debutStr = debut.toISOString().split('T')[0];

    const [revenus] = await pool.query(
      `SELECT date_revenu AS date, SUM(montant) AS total
       FROM revenus
       WHERE utilisateur_id = ? AND date_revenu >= ?
       GROUP BY date_revenu
       ORDER BY date_revenu ASC`,
      [req.utilisateurId, debutStr]
    );

    const [depenses] = await pool.query(
      `SELECT date_depense AS date, SUM(montant) AS total
       FROM depenses
       WHERE utilisateur_id = ? AND date_depense >= ?
       GROUP BY date_depense
       ORDER BY date_depense ASC`,
      [req.utilisateurId, debutStr]
    );

    function groupByPeriod(rows, type) {
      const map = {};
      for (const r of rows) {
        const p = new Period(type, new Date(r.date));
        const key = p.current.id;
        if (!map[key]) map[key] = { label: p.label, id: key, total: 0 };
        map[key].total += parseFloat(r.total) || 0;
      }
      return map;
    }

    const revMap = groupByPeriod(revenus, type);
    const depMap = groupByPeriod(depenses, type);

    const allKeys = new Set([...Object.keys(revMap), ...Object.keys(depMap)]);
    const data = Array.from(allKeys)
      .sort()
      .map(key => ({
        label: revMap[key]?.label || depMap[key]?.label || key,
        revenus: revMap[key]?.total || 0,
        depenses: depMap[key]?.total || 0,
      }));

    res.json(data);
  } catch (err) { next(err); }
};

exports.getTendancesCategories = async (req, res, next) => {
  try {
    const nbPeriods = Math.min(parseInt(req.query.nb) || 3, 12);
    const period = periodFromQuery(req);
    const type = period.type;

    const now = new Date();
    let debut;
    if (type === 'quotidien') {
      debut = new Date(now.getFullYear(), now.getMonth(), now.getDate() - nbPeriods + 1);
    } else if (type === 'hebdomadaire') {
      debut = new Date(now);
      debut.setDate(debut.getDate() - 7 * (nbPeriods - 1));
    } else {
      debut = new Date(now.getFullYear(), now.getMonth() - nbPeriods + 1, 1);
    }
    const debutStr = debut.toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT c.libelle, c.icone, c.couleur,
              d.date_depense AS date,
              COALESCE(SUM(d.montant), 0) AS total
       FROM depenses d
       LEFT JOIN categories c ON d.categorie_id = c.id
       WHERE d.utilisateur_id = ? AND d.date_depense >= ?
       GROUP BY d.categorie_id, d.date_depense
       ORDER BY c.libelle ASC, d.date_depense ASC`,
      [req.utilisateurId, debutStr]
    );

    const catMap = {};
    for (const r of rows) {
      const key = r.libelle || 'Sans catégorie';
      if (!catMap[key]) {
        catMap[key] = { libelle: key, icone: r.icone || '📦', couleur: r.couleur || '#9090A8', periods: {} };
      }
      const p = new Period(type, new Date(r.date));
      const pkey = p.current.id;
      if (!catMap[key].periods[pkey]) catMap[key].periods[pkey] = 0;
      catMap[key].periods[pkey] += parseFloat(r.total) || 0;
    }

    const allPeriodKeys = [];
    for (let i = 0; i < nbPeriods; i++) {
      let d;
      if (type === 'quotidien') {
        d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      } else if (type === 'hebdomadaire') {
        d = new Date(now);
        d.setDate(d.getDate() - 7 * i);
      } else {
        d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      }
      const p = new Period(type, d);
      allPeriodKeys.unshift(p.current.id);
    }

    const resultats = Object.values(catMap).map((cat) => {
      const series = [];
      let totalGeneral = 0;
      for (const pkey of allPeriodKeys) {
        const val = cat.periods[pkey] || 0;
        const p = new Period(type, new Date(pkey.includes('-W') ? pkey : pkey + '-01'));
        series.push({ label: p.label, total: val });
        totalGeneral += val;
      }
      const premier = series[0]?.total || 0;
      const dernier = series[series.length - 1]?.total || 0;
      const variation = premier > 0 ? Math.round(((dernier - premier) / premier) * 100) : 0;
      return {
        libelle: cat.libelle,
        icone: cat.icone,
        couleur: cat.couleur,
        total: totalGeneral,
        moyenne: Math.round(totalGeneral / nbPeriods),
        variation,
        tendance: variation > 10 ? 'hausse' : variation < -10 ? 'baisse' : 'stable',
        series,
      };
    });

    resultats.sort((a, b) => b.total - a.total);
    res.json(resultats);
  } catch (err) { next(err); }
};
