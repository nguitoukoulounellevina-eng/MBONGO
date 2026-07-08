const pool = require('../config/database');
const { creerNotification } = require('./notification.service');
const { sendPushToUser } = require('./push.service');
const Period = require('../utils/period');

async function verifierSeuils() {
  try {
    const now = new Date();
    const period = new Period('mensuel', now);

    const [seuils] = await pool.query(
      `SELECT s.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone
       FROM seuils s
       LEFT JOIN categories c ON c.id = s.categorie_id
       WHERE s.est_actif = 1`
    );

    for (const seuil of seuils) {
      const p = await getUserPeriod(seuil.utilisateur_id);
      const { debut, fin } = p.current;

      const [depenses] = await pool.query(
        `SELECT COALESCE(SUM(montant), 0) AS total
         FROM depenses
         WHERE utilisateur_id = ? AND categorie_id = ?
           AND date_depense BETWEEN ? AND ?`,
        [seuil.utilisateur_id, seuil.categorie_id, debut, fin]
      );

      const total = parseFloat(depenses[0].total) || 0;
      const montantSeuil = parseFloat(seuil.montant_seuil);

      if (total <= montantSeuil) continue;

      const catLibelle = seuil.categorie_libelle || `Catégorie #${seuil.categorie_id}`;

      if (seuil.type === 'blocage') {
        const titre = `Seuil de blocage atteint : ${catLibelle}`;
        const message = `Vous avez dépassé le seuil de blocage pour "${catLibelle}" (${montantSeuil.toLocaleString()} XAF / ${total.toLocaleString()} XAF).`;

        const [existing] = await pool.query(
          `SELECT id FROM notifications WHERE utilisateur_id = ? AND titre = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1`,
          [seuil.utilisateur_id, titre]
        );
        if (existing.length > 0) continue;

        await creerNotification(seuil.utilisateur_id, 'danger', titre, message);
        await sendPushToUser(seuil.utilisateur_id, titre, message, { type: 'seuil_blocage' });
      } else {
        const pct = Math.round((total / montantSeuil) * 100);
        const titre = `Alerte seuil : ${catLibelle}`;
        const message = `Vous avez atteint ${pct}% du seuil "${catLibelle}" (${total.toLocaleString()} XAF / ${montantSeuil.toLocaleString()} XAF).`;

        const seuilsAlertes = [80, 90, 100];
        for (const palier of seuilsAlertes) {
          if (pct >= palier && pct < palier + (palier === 100 ? 1 : 10)) {
            const titrePalier = palier === 100
              ? `Seuil atteint : ${catLibelle}`
              : `${catLibelle} : ${palier}% du seuil atteint`;

            const [existing] = await pool.query(
              `SELECT id FROM notifications WHERE utilisateur_id = ? AND titre = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1`,
              [seuil.utilisateur_id, titrePalier]
            );
            if (existing.length > 0) continue;

            await creerNotification(seuil.utilisateur_id, 'warning', titrePalier, message);
            await sendPushToUser(seuil.utilisateur_id, titrePalier, message, { type: 'seuil_alerte' });
          }
        }
      }
    }
  } catch (err) {
    console.error('[ThresholdCheck] Error:', err.message);
  }
}

async function getUserPeriod(utilisateurId) {
  try {
    const [[user]] = await pool.query(
      'SELECT periode_budget FROM utilisateurs WHERE id = ?',
      [utilisateurId]
    );
    const type = user?.periode_budget || 'mensuel';
    return new Period(type, new Date());
  } catch {
    return new Period('mensuel', new Date());
  }
}

module.exports = { verifierSeuils };
