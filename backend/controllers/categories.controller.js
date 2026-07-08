const pool = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE utilisateur_id = ? OR utilisateur_id IS NULL ORDER BY type, libelle',
      [req.utilisateurId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND (utilisateur_id = ? OR utilisateur_id IS NULL)',
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Catégorie introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { libelle, nom, type, icone, emoji, couleur } = req.body;
    const [result] = await pool.query(
      'INSERT INTO categories (utilisateur_id, libelle, type, icone, couleur) VALUES (?, ?, ?, ?, ?)',
      [req.utilisateurId, libelle || nom, type, icone || emoji || '📦', couleur || '#7C3AED']
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { libelle, nom, type, icone, emoji, couleur } = req.body;
    await pool.query(
      'UPDATE categories SET libelle = ?, type = ?, icone = ?, couleur = ? WHERE id = ? AND utilisateur_id = ?',
      [libelle || nom, type, icone || emoji, couleur, req.params.id, req.utilisateurId]
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Catégorie introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.toggleQuotidien = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT est_quotidien FROM categories WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Catégorie introuvable.' });
    const newVal = rows[0].est_quotidien ? 0 : 1;
    await pool.query(
      'UPDATE categories SET est_quotidien = ? WHERE id = ?',
      [newVal, req.params.id]
    );
    res.json({ id: parseInt(req.params.id), est_quotidien: newVal });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM categories WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Catégorie introuvable.' });
    res.json({ message: 'Catégorie supprimée.' });
  } catch (err) { next(err); }
};
