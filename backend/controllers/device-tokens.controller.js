const pool = require('../config/database');

exports.register = async (req, res, next) => {
  try {
    const { token, plateforme } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token requis.' });
    }
    await pool.query(
      'INSERT INTO device_tokens (utilisateur_id, token, plateforme) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE plateforme = VALUES(plateforme)',
      [req.utilisateurId, token, plateforme || 'unknown']
    );
    res.json({ message: 'Token enregistré.' });
  } catch (err) { next(err); }
};

exports.unregister = async (req, res, next) => {
  try {
    const { token } = req.params;
    await pool.query(
      'DELETE FROM device_tokens WHERE token = ? AND utilisateur_id = ?',
      [token, req.utilisateurId]
    );
    res.json({ message: 'Token supprimé.' });
  } catch (err) { next(err); }
};
