const pool = require('../config/database');
const { creerNotification } = require('./notification.service');
const { sendPushToUser } = require('./push.service');

async function verifierRappelsDepensesJournalieres() {
  try {
    const aujourdhui = new Date().toISOString().slice(0, 10);

    const [users] = await pool.query(
      `SELECT id, prenom, nom
       FROM utilisateurs
       WHERE est_actif = 1
         AND id NOT IN (
           SELECT DISTINCT utilisateur_id
           FROM depenses
           WHERE date_depense = ?
         )`,
      [aujourdhui]
    );

    for (const user of users) {
      const titre = 'Avez-vous dépensé aujourd\'hui ?';
      const message = `Bonjour ${user.prenom}, vous n'avez enregistré aucune dépense aujourd'hui. Pensez à mettre à jour vos finances sur MBONGO.`;

      await creerNotification(user.id, 'info', titre, message);
      await sendPushToUser(user.id, titre, message, { type: 'rappel_depense' });
    }

    if (users.length > 0) {
      console.log(`[DailyReminder] ${users.length} utilisateur(s) relancé(s)`);
    }
  } catch (err) {
    console.error('[DailyReminder] Error:', err.message);
  }
}

module.exports = { verifierRappelsDepensesJournalieres };
