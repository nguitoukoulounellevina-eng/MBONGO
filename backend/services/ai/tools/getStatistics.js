const pool = require('../../../config/database');

exports.getStatistics = async (utilisateurId) => {
  try {
    const now = new Date();
    const mois = now.getMonth() + 1;
    const annee = now.getFullYear();

    /* ── Revenus du mois ── */
    const [[revRow]] = await pool.query(
      'SELECT COALESCE(SUM(montant), 0) AS total FROM revenus WHERE utilisateur_id = ? AND MONTH(date_revenu) = ? AND YEAR(date_revenu) = ?',
      [utilisateurId, mois, annee]
    );

    /* ── Dépenses du mois ── */
    const [[depRow]] = await pool.query(
      'SELECT COALESCE(SUM(montant), 0) AS total FROM depenses WHERE utilisateur_id = ? AND MONTH(date_depense) = ? AND YEAR(date_depense) = ?',
      [utilisateurId, mois, annee]
    );

    /* ── Budget du mois ── */
    const [[budRow]] = await pool.query(
      'SELECT COALESCE(SUM(montant_utilise), 0) AS utilise, COALESCE(SUM(montant_prevu), 0) AS prevu FROM budgets WHERE utilisateur_id = ? AND mois = ? AND annee = ?',
      [utilisateurId, mois, annee]
    );

    /* ── Comptes ── */
    const [[compteRow]] = await pool.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(solde_actuel), 0) AS solde_total FROM comptes WHERE utilisateur_id = ?',
      [utilisateurId]
    );

    /* ── Objectifs ── */
    const [[objRow]] = await pool.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(montant_actuel), 0) AS epargne, COALESCE(SUM(montant_cible), 0) AS cible FROM objectifs_epargne WHERE utilisateur_id = ?',
      [utilisateurId]
    );

    const revenus = parseFloat(revRow.total) || 0;
    const depenses = parseFloat(depRow.total) || 0;
    const budgetUtilise = parseFloat(budRow.utilise) || 0;
    const budgetPrevu = parseFloat(budRow.prevu) || 0;
    const epargne = parseFloat(objRow.epargne) || 0;

    const objectifCible = parseFloat(objRow.cible) || 0;

    const data = {
      revenus,
      depenses,
      epargne,
      budget: {
        utilise: budgetUtilise,
        prevu: budgetPrevu,
        restant: Math.max(0, budgetPrevu - budgetUtilise),
      },
      objectifs: {
        total: parseInt(objRow.total) || 0,
        epargne,
        cible: objectifCible,
      },
      comptes: {
        total: parseInt(compteRow.total) || 0,
        solde_total: parseFloat(compteRow.solde_total) || 0,
      },
      taux_progression: objectifCible > 0 ? Math.round((epargne / objectifCible) * 100) : 0,
      ratio_depenses: revenus > 0 ? Math.round((depenses / revenus) * 100) : 0,
    };

    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
