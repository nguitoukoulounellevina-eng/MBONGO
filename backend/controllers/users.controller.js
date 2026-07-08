const pool = require('../config/database');
const Period = require('../utils/period');

exports.getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, prenom, nom, email, telephone, photo, est_actif, derniere_connexion, periode_budget, created_at FROM utilisateurs WHERE id = ?',
      [req.utilisateurId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { prenom, nom, telephone } = req.body;

    const updates = [];
    const params = [];

    if (prenom !== undefined) { updates.push('prenom = ?'); params.push(prenom); }
    if (nom !== undefined) { updates.push('nom = ?'); params.push(nom); }
    if (telephone !== undefined) { updates.push('telephone = ?'); params.push(telephone || null); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour.' });
    }

    params.push(req.utilisateurId);
    await pool.query(
      `UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [rows] = await pool.query(
      'SELECT id, prenom, nom, email, telephone, photo, periode_budget FROM utilisateurs WHERE id = ?',
      [req.utilisateurId]
    );

    res.json({ message: 'Profil mis à jour.', utilisateur: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE utilisateurs SET photo = NULL WHERE id = ?',
      [req.utilisateurId]
    );

    const [rows] = await pool.query(
      'SELECT id, prenom, nom, email, telephone, photo FROM utilisateurs WHERE id = ?',
      [req.utilisateurId]
    );

    res.json({ message: 'Photo supprimée.', utilisateur: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getPeriode = async (req, res, next) => {
  try {
    const [[user]] = await pool.query(
      'SELECT periode_budget FROM utilisateurs WHERE id = ?',
      [req.utilisateurId]
    );
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const period = new Period(user.periode_budget);

    res.json(period.toJSON());
  } catch (err) { next(err); }
};

exports.updatePeriode = async (req, res, next) => {
  try {
    const { periode_budget } = req.body;
    const valides = ['quotidien', 'hebdomadaire', 'mensuel'];
    if (!valides.includes(periode_budget)) {
      return res.status(400).json({ message: 'Période invalide. Choisissez: quotidien, hebdomadaire ou mensuel.' });
    }

    await pool.query(
      'UPDATE utilisateurs SET periode_budget = ? WHERE id = ?',
      [periode_budget, req.utilisateurId]
    );

    const period = new Period(periode_budget);

    res.json({ message: 'Période mise à jour.', periode: period.toJSON() });
  } catch (err) { next(err); }
};

exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune photo fournie.' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    await pool.query(
      'UPDATE utilisateurs SET photo = ? WHERE id = ?',
      [photoUrl, req.utilisateurId]
    );

    const [rows] = await pool.query(
      'SELECT id, prenom, nom, email, telephone, photo FROM utilisateurs WHERE id = ?',
      [req.utilisateurId]
    );

    res.json({ message: 'Photo mise à jour.', utilisateur: rows[0] });
  } catch (err) {
    next(err);
  }
};
