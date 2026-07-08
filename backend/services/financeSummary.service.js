const pool = require('../config/database');

async function getSummary(utilisateurId, debut, fin) {
  const [[revRow]] = await pool.query(
    'SELECT COALESCE(SUM(montant), 0) AS total FROM revenus WHERE utilisateur_id = ? AND date_revenu BETWEEN ? AND ?',
    [utilisateurId, debut, fin]
  );

  const [[depRow]] = await pool.query(
    'SELECT COALESCE(SUM(montant), 0) AS total FROM depenses WHERE utilisateur_id = ? AND date_depense BETWEEN ? AND ?',
    [utilisateurId, debut, fin]
  );

  const [[objRow]] = await pool.query(
    'SELECT COUNT(*) AS total, COALESCE(SUM(montant_actuel), 0) AS epargne, COALESCE(SUM(montant_cible), 0) AS cible FROM objectifs_epargne WHERE utilisateur_id = ?',
    [utilisateurId]
  );

  const [[budRow]] = await pool.query(
    `SELECT COALESCE(SUM(montant_utilise), 0) AS utilise,
            COALESCE(SUM(COALESCE((
              SELECT SUM(b2.montant_prevu) FROM budgets b2
              WHERE b2.categorie_id = budgets.categorie_id
                AND b2.utilisateur_id = budgets.utilisateur_id
                AND b2.periode_type IN ('quotidien','hebdomadaire')
                AND b2.date_debut >= budgets.date_debut
                AND b2.date_fin <= budgets.date_fin
                AND b2.id != budgets.id
            ), 0)), 0) AS reserve,
            COALESCE(SUM(montant_prevu), 0) AS prevu
     FROM budgets
     WHERE utilisateur_id = ? AND date_debut <= ? AND date_fin >= ?`,
    [utilisateurId, fin, debut]
  );

  const [[compteRow]] = await pool.query(
    'SELECT COUNT(*) AS total, COALESCE(SUM(solde_actuel), 0) AS solde_total FROM comptes WHERE utilisateur_id = ?',
    [utilisateurId]
  );

  const [topCategories] = await pool.query(
    `SELECT c.libelle, c.icone, c.couleur, COALESCE(SUM(d.montant), 0) AS total
     FROM depenses d
     LEFT JOIN categories c ON d.categorie_id = c.id
     WHERE d.utilisateur_id = ? AND d.date_depense BETWEEN ? AND ?
     GROUP BY d.categorie_id
     ORDER BY total DESC
     LIMIT 3`,
    [utilisateurId, debut, fin]
  );

  const revenus = parseFloat(revRow.total) || 0;
  const depenses = parseFloat(depRow.total) || 0;
  const epargne = parseFloat(objRow.epargne) || 0;
  const objectifCible = parseFloat(objRow.cible) || 0;
  const budgetUtilise = parseFloat(budRow.utilise) || 0;
  const budgetReserve = parseFloat(budRow.reserve) || 0;
  const budgetPrevu = parseFloat(budRow.prevu) || 0;
  const budgetEffectif = budgetUtilise + budgetReserve;

  return {
    revenus,
    depenses,
    taux_progression: objectifCible > 0 ? Math.round((epargne / objectifCible) * 100) : 0,
    budget: {
      utilise: budgetUtilise,
      reserve: budgetReserve,
      effectif: budgetEffectif,
      prevu: budgetPrevu,
      restant: Math.max(0, budgetPrevu - budgetEffectif),
    },
    comptes: {
      total: parseInt(compteRow.total) || 0,
      solde_total: parseFloat(compteRow.solde_total) || 0,
    },
    objectifs: {
      total: parseInt(objRow.total) || 0,
      epargne,
      cible: objectifCible,
    },
    top_categories: topCategories,
    ratio_depenses: revenus > 0 ? Math.round((depenses / revenus) * 100) : 0,
  };
}

module.exports = { getSummary };
