const pool = require('../config/database');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushToUser(utilisateurId, titre, message, data = {}) {
  try {
    const [tokens] = await pool.query(
      'SELECT token FROM device_tokens WHERE utilisateur_id = ?',
      [utilisateurId]
    );

    const invalidTokens = [];

    for (const row of tokens) {
      if (!Expo.isExpoPushToken(row.token)) {
        invalidTokens.push(row.token);
        continue;
      }

      const chunks = expo.chunkPushNotifications([{
        to: row.token,
        sound: 'default',
        title: titre,
        body: message,
        data,
      }]);

      for (const chunk of chunks) {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(row.token);
          }
        }
      }
    }

    if (invalidTokens.length > 0) {
      await pool.query(
        `DELETE FROM device_tokens WHERE token IN (${invalidTokens.map(() => '?').join(',')})`,
        invalidTokens
      );
    }
  } catch (err) {
    console.error('[Push] Error sending to user', utilisateurId, err.message);
  }
}

module.exports = { sendPushToUser };
