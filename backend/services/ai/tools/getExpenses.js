const pool = require('../../../config/database');

exports.getExpenses = async (utilisateurId, filters = {}) => {
  try {
    const now = new Date();
    const mois = now.getMonth() + 1;
    const annee = now.getFullYear();

    let query = `
      SELECT d.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone, c.couleur AS categorie_couleur,
             co.nom_compte, co.type_compte
      FROM depenses d
      LEFT JOIN categories c ON d.categorie_id = c.id
      LEFT JOIN comptes co ON d.compte_id = co.id
      WHERE d.utilisateur_id = ?
        AND MONTH(d.date_depense) = ?
        AND YEAR(d.date_depense) = ?
    `;
    const params = [utilisateurId, mois, annee];

    if (filters.categorie_id) {
      query += ' AND d.categorie_id = ?';
      params.push(filters.categorie_id);
    }

    if (filters.categorie_libelle) {
      query += ' AND c.libelle LIKE ?';
      params.push(`%${filters.categorie_libelle}%`);
    }

    query += ' ORDER BY d.date_depense DESC, d.id DESC';

    const [rows] = await pool.query(query, params);

    const data = rows.map((r) => ({
      id: r.id,
      libelle: r.libelle || 'Dépense',
      montant: parseFloat(r.montant) || 0,
      categorie: r.categorie_libelle || 'Non catégorisé',
      icone: r.categorie_icone || '💸',
      couleur: r.categorie_couleur || '#9090A8',
      date: r.date_depense ? r.date_depense.toISOString().split('T')[0] : null,
      compte: r.nom_compte || null,
      compte_type: r.type_compte || null,
      lieu: r.lieu || null,
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
