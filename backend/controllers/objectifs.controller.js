const pool = require('../config/database');
const { creerNotification } = require('../services/notification.service');
const { sendPushToUser } = require('../services/push.service');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM objectifs_epargne WHERE utilisateur_id = ? ORDER BY date_limite ASC`,
      [req.utilisateurId]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM objectifs_epargne WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Objectif introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { titre, montant_cible, date_limite, icone } = req.body;
    const [result] = await pool.query(
      'INSERT INTO objectifs_epargne (utilisateur_id, titre, montant_cible, date_limite, icone) VALUES (?, ?, ?, ?, ?)',
      [req.utilisateurId, titre, montant_cible, date_limite || null, icone || '🎯']
    );
    const [rows] = await pool.query('SELECT * FROM objectifs_epargne WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [current] = await conn.query(
      'SELECT * FROM objectifs_epargne WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (current.length === 0) return res.status(404).json({ message: 'Objectif introuvable.' });

    const cur = current[0];
    const titre = req.body.titre ?? cur.titre;
    const montant_cible = req.body.montant_cible ?? cur.montant_cible;
    const montant_actuel = req.body.montant_actuel ?? cur.montant_actuel;
    const date_limite = req.body.date_limite !== undefined ? req.body.date_limite : cur.date_limite;
    let statut = req.body.statut ?? cur.statut;
    const icone = req.body.icone ?? cur.icone;

    if (parseFloat(montant_actuel) >= parseFloat(montant_cible) && statut !== 'atteint') {
      statut = 'atteint';
    }
    if (parseFloat(montant_actuel) < parseFloat(montant_cible) && statut === 'atteint') {
      statut = 'en_cours';
    }

    await conn.beginTransaction();

    await conn.query(
      'UPDATE objectifs_epargne SET titre = ?, montant_cible = ?, montant_actuel = ?, date_limite = ?, statut = ?, icone = ? WHERE id = ? AND utilisateur_id = ?',
      [titre, montant_cible, montant_actuel, date_limite, statut, icone, req.params.id, req.utilisateurId]
    );

    if (cur.statut !== 'atteint' && statut === 'atteint') {
      const [existing] = await conn.query(
        `SELECT id FROM notifications WHERE utilisateur_id = ? AND type = 'success' AND titre = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1`,
        [req.utilisateurId, `Objectif atteint : ${titre}`]
      );
      if (!existing || existing.length === 0) {
        const titreNotif = `Objectif atteint : ${titre}`;
        const messageNotif = `Félicitations ! Vous avez atteint l'objectif "${titre}" (${parseFloat(montant_cible).toLocaleString()} XAF).`;
        await creerNotification(req.utilisateurId, 'success', titreNotif, messageNotif, conn);
        await sendPushToUser(req.utilisateurId, titreNotif, messageNotif, { type: 'objectif' });
      }
    }

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM objectifs_epargne WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM objectifs_epargne WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Objectif introuvable.' });
    res.json({ message: 'Objectif supprimé.' });
  } catch (err) { next(err); }
};

exports.alimenter = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { compte_id, montant } = req.body;
    if (!montant || montant <= 0) return res.status(400).json({ message: 'Montant invalide.' });

    const [objectifs] = await conn.query(
      'SELECT * FROM objectifs_epargne WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (objectifs.length === 0) return res.status(404).json({ message: 'Objectif introuvable.' });

    await conn.beginTransaction();

    if (compte_id) {
      const [comptes] = await conn.query(
        'SELECT * FROM comptes WHERE id = ? AND utilisateur_id = ?',
        [compte_id, req.utilisateurId]
      );
      if (comptes.length === 0) {
        await conn.rollback();
        return res.status(404).json({ message: 'Compte introuvable.' });
      }
      const solde = parseFloat(comptes[0].solde_actuel || 0);
      if (solde < montant) {
        await conn.rollback();
        return res.status(400).json({ message: 'Solde insuffisant sur le compte.' });
      }
      await conn.query('UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ?', [montant, compte_id]);
    }

    await conn.query(
      `UPDATE objectifs_epargne
       SET montant_actuel = montant_actuel + ?,
           statut = CASE WHEN montant_actuel + ? >= montant_cible THEN 'atteint' ELSE statut END
       WHERE id = ?`,
      [montant, montant, req.params.id]
    );

    await conn.query(
      'INSERT INTO objectifs_alimentations (objectif_id, compte_id, montant) VALUES (?, ?, ?)',
      [req.params.id, compte_id || null, montant]
    );

    const titreNotifAlim = `Objectif alimenté : ${objectifs[0].titre}`;
    const messageNotifAlim = `Vous avez versé ${parseFloat(montant).toLocaleString()} XAF sur votre objectif "${objectifs[0].titre}".`;
    await creerNotification(req.utilisateurId, 'info', titreNotifAlim, messageNotifAlim, conn);
    await sendPushToUser(req.utilisateurId, titreNotifAlim, messageNotifAlim, { type: 'objectif' });

    if (objectifs[0].statut !== 'atteint') {
      const [objUpdated] = await conn.query('SELECT * FROM objectifs_epargne WHERE id = ?', [req.params.id]);
      if (objUpdated.length > 0 && objUpdated[0].statut === 'atteint') {
        const [existing] = await conn.query(
          `SELECT id FROM notifications WHERE utilisateur_id = ? AND type = 'success' AND titre = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1`,
          [req.utilisateurId, `Objectif atteint : ${objUpdated[0].titre}`]
        );
        if (!existing || existing.length === 0) {
          const titreNotif = `Objectif atteint : ${objUpdated[0].titre}`;
          const messageNotif = `Félicitations ! Vous avez atteint l'objectif "${objUpdated[0].titre}" (${parseFloat(objUpdated[0].montant_cible).toLocaleString()} XAF).`;
          await creerNotification(req.utilisateurId, 'success', titreNotif, messageNotif, conn);
          await sendPushToUser(req.utilisateurId, titreNotif, messageNotif, { type: 'objectif' });
        }
      }
    }

    await conn.commit();

    const [rows] = await pool.query('SELECT * FROM objectifs_epargne WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.getAlimentations = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, c.nom_compte, c.type_compte
       FROM objectifs_alimentations a
       LEFT JOIN comptes c ON a.compte_id = c.id
       WHERE a.objectif_id = ?
       ORDER BY a.date_alimentation DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};
