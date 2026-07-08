const EventEmitter = require('events');
const pool = require('../config/database');

const notificationEvent = new EventEmitter();

async function creerNotification(utilisateurId, type, titre, message, conn = null) {
  const db = conn || pool;
  const [result] = await db.query(
    'INSERT INTO notifications (utilisateur_id, type, titre, message) VALUES (?, ?, ?, ?)',
    [utilisateurId, type, titre, message]
  );
  const notification = { id: result.insertId, type, titre, message, est_lue: 0, created_at: new Date().toISOString() };
  notificationEvent.emit('new', { utilisateurId, notification });
  return notification;
}

async function creerAlertesDepuisAnalyse(utilisateurId, pointsAttention) {
  const created = [];

  for (const point of pointsAttention) {
    const existant = await pool.query(
      `SELECT id FROM notifications 
       WHERE utilisateur_id = ? AND type = ? AND titre = ? 
       AND (created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) OR est_lue = 1)
       LIMIT 1`,
      [utilisateurId, point.type, point.titre]
    );

    if (existant[0] && existant[0].length > 0) {
      continue;
    }

    const notif = await creerNotification(utilisateurId, point.type, point.titre, point.message.replace(/\*\*/g, ''));

    created.push(notif);
  }

  return created;
}

async function getNonLues(utilisateurId) {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE utilisateur_id = ? AND est_lue = 0 ORDER BY created_at DESC',
    [utilisateurId]
  );
  return rows;
}

async function getUnreadCount(utilisateurId) {
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE utilisateur_id = ? AND est_lue = 0',
    [utilisateurId]
  );
  return count;
}

async function getAll(utilisateurId) {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE utilisateur_id = ? ORDER BY created_at DESC',
    [utilisateurId]
  );
  return rows;
}

async function marquerLue(id, utilisateurId) {
  await pool.query('UPDATE notifications SET est_lue = 1 WHERE id = ? AND utilisateur_id = ?', [id, utilisateurId]);
}

async function marquerToutesLues(utilisateurId) {
  await pool.query('UPDATE notifications SET est_lue = 1 WHERE utilisateur_id = ?', [utilisateurId]);
}

module.exports = {
  notificationEvent,
  creerNotification,
  creerAlertesDepuisAnalyse,
  getNonLues,
  getUnreadCount,
  getAll,
  marquerLue,
  marquerToutesLues,
};
