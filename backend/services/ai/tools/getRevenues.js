const pool = require('../../../config/database');

exports.getRevenues = async (utilisateurId) => {
  try {
    const now = new Date();
    const mois = now.getMonth() + 1;
    const annee = now.getFullYear();

    const [rows] = await pool.query(
      `SELECT r.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone, c.couleur AS categorie_couleur,
              co.nom_compte, co.type_compte
       FROM revenus r
       LEFT JOIN categories c ON r.categorie_id = c.id
       LEFT JOIN comptes co ON r.compte_id = co.id
       WHERE r.utilisateur_id = ?
         AND MONTH(r.date_revenu) = ?
         AND YEAR(r.date_revenu) = ?
       ORDER BY r.date_revenu DESC, r.id DESC`,
      [utilisateurId, mois, annee]
    );

    const total = rows.reduce((s, r) => s + (parseFloat(r.montant) || 0), 0);

    const data = rows.map((r) => ({
      id: r.id,
      libelle: r.libelle || 'Revenu',
      montant: parseFloat(r.montant) || 0,
      source: r.categorie_libelle || r.libelle || 'Revenu',
      icone: r.categorie_icone || '💰',
      date: r.date_revenu ? r.date_revenu.toISOString().split('T')[0] : null,
      compte: r.nom_compte || null,
      recurrent: !!r.recurrent,
      frequence: r.frequence || 'unique',
    }));

    return { success: true, data, total };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
