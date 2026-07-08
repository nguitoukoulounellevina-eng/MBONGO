const pool = require('../../../config/database');

exports.getGoals = async (utilisateurId) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM objectifs_epargne WHERE utilisateur_id = ? ORDER BY date_limite ASC`,
      [utilisateurId]
    );

    const data = rows.map((r) => {
      const cible = parseFloat(r.montant_cible) || 0;
      const actuel = parseFloat(r.montant_actuel) || 0;
      const progression = cible > 0 ? Math.round((actuel / cible) * 100) : 0;

      return {
        id: r.id,
        titre: r.titre || 'Objectif',
        icone: r.icone || '🎯',
        cible,
        actuel,
        restant: Math.max(0, cible - actuel),
        progression,
        statut: r.statut || 'en_cours',
        date_limite: r.date_limite ? r.date_limite.toISOString().split('T')[0] : null,
      };
    });

    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
