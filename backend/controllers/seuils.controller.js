const pool = require('../config/database');
const Period = require('../utils/period');

function getPeriod(req) {
  if (req.query.mois && req.query.annee) {
    const d = new Date(parseInt(req.query.annee), parseInt(req.query.mois) - 1, 1);
    return new Period('mensuel', d);
  }
  return req.period;
}

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.libelle as categorie_libelle, c.icone as categorie_icone
       FROM seuils s
       LEFT JOIN categories c ON c.id = s.categorie_id
       WHERE s.utilisateur_id = ?
       ORDER BY s.created_at DESC`,
      [req.utilisateurId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { categorie_id, montant_seuil, type } = req.body;
    if (!categorie_id || montant_seuil == null) {
      return res.status(400).json({ message: 'categorie_id et montant_seuil requis.' });
    }
    const [result] = await pool.query(
      'INSERT INTO seuils (utilisateur_id, categorie_id, montant_seuil, type) VALUES (?, ?, ?, ?)',
      [req.utilisateurId, categorie_id, montant_seuil, type || 'alerte']
    );
    res.status(201).json({ id: result.insertId, message: 'Seuil créé.' });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM seuils WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Seuil introuvable.' });
    res.json({ message: 'Seuil supprimé.' });
  } catch (err) { next(err); }
};

exports.check = async (req, res, next) => {
  try {
    const period = getPeriod(req);
    const { debut, fin } = period.current;

    const [seuils] = await pool.query(
      `SELECT s.*, c.libelle as categorie_libelle, c.icone as categorie_icone
       FROM seuils s
       LEFT JOIN categories c ON c.id = s.categorie_id
       WHERE s.utilisateur_id = ?`,
      [req.utilisateurId]
    );

    const resultats = [];
    for (const seuil of seuils) {
      const [depenses] = await pool.query(
        `SELECT COALESCE(SUM(montant), 0) as total
         FROM depenses
         WHERE utilisateur_id = ? AND categorie_id = ? AND date_depense BETWEEN ? AND ?`,
        [req.utilisateurId, seuil.categorie_id, debut, fin]
      );
      const total = parseFloat(depenses[0].total) || 0;
      const pct = seuil.montant_seuil > 0 ? Math.round((total / seuil.montant_seuil) * 100) : 0;

      resultats.push({
        id: seuil.id,
        categorie_id: seuil.categorie_id,
        categorie_libelle: seuil.categorie_libelle,
        categorie_icone: seuil.categorie_icone,
        montant_seuil: parseFloat(seuil.montant_seuil),
        total_actuel: total,
        pourcentage: pct,
        depasse: total > seuil.montant_seuil,
        type: seuil.type,
      });
    }

    res.json(resultats);
  } catch (err) { next(err); }
};
