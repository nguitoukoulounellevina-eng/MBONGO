const pool = require('../config/database');
const { creerNotification } = require('./notification.service');
const { sendPushToUser } = require('./push.service');

const RAPPELS = [
  {
    niveau: 1,
    minHeures: 24,
    maxHeures: 48,
    titre: 'Rappel de suivi financier',
    message: (prenom) => `Bonjour ${prenom}, cela fait 1 jour sans suivi de vos finances. Prenez 2 minutes pour mettre à jour vos dépenses !`,
    type: 'info',
  },
  {
    niveau: 2,
    minHeures: 48,
    maxHeures: 72,
    titre: 'Vos finances vous attendent',
    message: (prenom) => `Bonjour ${prenom}, cela fait 2 jours que vous n'avez pas consulté MBONGO. Vos finances vous attendent !`,
    type: 'warning',
  },
  {
    niveau: 3,
    minHeures: 72,
    maxHeures: Infinity,
    titre: 'Alerte inactivité',
    message: (prenom) => `Bonjour ${prenom}, 3 jours sans activité ! Ne laissez pas vos dépenses s'accumuler. Ouvrez MBONGO maintenant.`,
    type: 'danger',
  },
];

function getNiveau(heuresInactif) {
  for (const r of RAPPELS) {
    if (heuresInactif >= r.minHeures && heuresInactif < r.maxHeures) {
      return r;
    }
  }
  return null;
}

async function verifierEtEnvoyerRappels() {
  try {
    const [users] = await pool.query(
      `SELECT id, prenom, nom, derniere_connexion,
              TIMESTAMPDIFF(HOUR, derniere_connexion, NOW()) AS heures_inactif
       FROM utilisateurs
       WHERE est_actif = 1
         AND derniere_connexion IS NOT NULL
         AND derniere_connexion < NOW() - INTERVAL 24 HOUR`
    );

    for (const user of users) {
      const rappel = getNiveau(user.heures_inactif);
      if (!rappel) continue;

      const [dejaEnvoye] = await pool.query(
        `SELECT id FROM notifications
         WHERE utilisateur_id = ? AND titre = ?
         LIMIT 1`,
        [user.id, rappel.titre]
      );

      if (dejaEnvoye.length > 0) continue;

      const titre = rappel.titre;
      const message = rappel.message(user.prenom);

      await creerNotification(user.id, rappel.type, titre, message);
      await sendPushToUser(user.id, titre, message, { type: 'inactivite' });
    }
  } catch (err) {
    console.error('[Reminder] Error:', err.message);
  }
}

module.exports = { verifierEtEnvoyerRappels };
