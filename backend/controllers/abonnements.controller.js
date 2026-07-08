const pool = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    // 1. Détection automatique : dépenses récurrentes (même libellé + même montant dans plusieurs mois)
    const [detected] = await pool.query(
      `SELECT d.libelle, d.montant, MIN(c.icone) AS icone,
              COUNT(DISTINCT CONCAT(YEAR(d.date_depense), '-', MONTH(d.date_depense))) AS nb_mois,
              MAX(d.date_depense) AS derniere_date,
              COALESCE(SUM(d.montant), 0) AS total_depense
       FROM depenses d
       LEFT JOIN categories c ON d.categorie_id = c.id
       WHERE d.utilisateur_id = ?
         AND d.libelle IS NOT NULL AND d.libelle != ''
       GROUP BY LOWER(TRIM(d.libelle)), d.montant
       HAVING nb_mois >= 2
       ORDER BY d.montant DESC`,
      [req.utilisateurId]
    );

    // 2. Marquer manuellement comme abonnement explicite (notes/libelle contient "abonnement")
    const [flagged] = await pool.query(
      `SELECT d.libelle, d.montant, c.icone,
              1 AS nb_mois, MAX(d.date_depense) AS derniere_date,
              COALESCE(SUM(d.montant), 0) AS total_depense
       FROM depenses d
       LEFT JOIN categories c ON d.categorie_id = c.id
       WHERE d.utilisateur_id = ?
         AND (LOWER(d.libelle) LIKE '%abonnement%' OR LOWER(d.notes) LIKE '%abonnement%')
         AND d.libelle IS NOT NULL AND d.libelle != ''
       GROUP BY LOWER(TRIM(d.libelle)), d.montant
       HAVING nb_mois < 2`,
      [req.utilisateurId]
    );

    const merged = [...detected, ...flagged];

    // Dédupliquer par libelle+montant
    const seen = new Set();
    const resultats = [];
    for (const r of merged) {
      const key = `${(r.libelle || '').toLowerCase().trim()}|${r.montant}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const derniere = r.derniere_date ? new Date(r.derniere_date) : new Date();
      const now = new Date();
      const diffMs = now.getTime() - derniere.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      resultats.push({
        libelle: r.libelle,
        montant: parseFloat(r.montant),
        icone: r.icone || '📱',
        nb_mois: r.nb_mois,
        total_depense: parseFloat(r.total_depense),
        derniere_date: r.derniere_date,
        jours_depuis_dernier: diffDays,
        actif: diffDays < 45,
      });
    }

    resultats.sort((a, b) => b.montant - a.montant);
    res.json(resultats);
  } catch (err) { next(err); }
};
