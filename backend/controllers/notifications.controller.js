const pool = require('../config/database');
const notificationService = require('../services/notification.service');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE utilisateur_id = ? ORDER BY created_at DESC',
      [req.utilisateurId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getNonLues = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE utilisateur_id = ? AND est_lue = 0 ORDER BY created_at DESC',
      [req.utilisateurId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.marquerLue = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET est_lue = 1 WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (err) { next(err); }
};

exports.marquerToutesLues = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET est_lue = 1 WHERE utilisateur_id = ?',
      [req.utilisateurId]
    );
    res.json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (err) { next(err); }
};

exports.supprimer = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Notification introuvable.' });
    res.json({ message: 'Notification supprimée.' });
  } catch (err) { next(err); }
};

exports.creerNotification = async (req, res, next) => {
  try {
    const { type, titre, message } = req.body;
    const notif = await notificationService.creerNotification(req.utilisateurId, type || null, titre, message);
    res.status(201).json({ id: notif.id, message: 'Notification créée.' });
  } catch (err) { next(err); }
};
