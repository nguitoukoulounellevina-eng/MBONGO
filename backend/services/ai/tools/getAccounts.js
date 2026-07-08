const pool = require('../../../config/database');

exports.getAccounts = async (utilisateurId) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*,
              COALESCE((SELECT SUM(bc.montant_preleve) FROM budgets_comptes bc WHERE bc.compte_id = c.id), 0) AS reserve
       FROM comptes c
       WHERE c.utilisateur_id = ?
       ORDER BY c.created_at DESC`,
      [utilisateurId]
    );

    const data = rows.map((r) => ({
      id: r.id,
      nom: r.nom_compte,
      type: r.type_compte,
      solde: parseFloat(r.solde_actuel) || 0,
      devise: r.devise || 'XAF',
      reserve: parseFloat(r.reserve) || 0,
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
