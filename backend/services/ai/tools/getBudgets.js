const pool = require('../../../config/database');

exports.getBudgets = async (utilisateurId) => {
  try {
    const now = new Date();
    const mois = now.getMonth() + 1;
    const annee = now.getFullYear();

    const [rows] = await pool.query(
      `SELECT b.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone, c.couleur AS categorie_couleur,
              COALESCE(SUM(d.montant), 0) AS montant_depense,
              (b.montant_prevu - b.montant_utilise) AS montant_restant
       FROM budgets b
       LEFT JOIN categories c ON b.categorie_id = c.id
       LEFT JOIN depenses d ON d.categorie_id = b.categorie_id
         AND MONTH(d.date_depense) = b.mois AND YEAR(d.date_depense) = b.annee
         AND d.utilisateur_id = b.utilisateur_id
       WHERE b.utilisateur_id = ? AND b.mois = ? AND b.annee = ?
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [utilisateurId, mois, annee]
    );

    const data = rows.map((r) => ({
      id: r.id,
      categorie: r.categorie_libelle || 'Budget',
      icone: r.categorie_icone || '📊',
      couleur: r.categorie_couleur || '#9090A8',
      prevu: parseFloat(r.montant_prevu) || 0,
      utilise: parseFloat(r.montant_utilise) || 0,
      restant: parseFloat(r.montant_restant) || 0,
      depasse: parseFloat(r.montant_utilise || 0) > parseFloat(r.montant_prevu || 0),
      mois: r.mois,
      annee: r.annee,
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
