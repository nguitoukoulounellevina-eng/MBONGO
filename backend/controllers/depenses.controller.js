const pool = require('../config/database');
const { creerNotification } = require('../services/notification.service');
const { sendPushToUser } = require('../services/push.service');

function formatLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPeriod(req) {
  if (req.query.debut && req.query.fin) {
    return { debut: req.query.debut, fin: req.query.fin };
  }
  if (req.query.mois && req.query.annee) {
    const { mois, annee } = req.query;
    return {
      debut: `${annee}-${String(mois).padStart(2, '0')}-01`,
      fin: formatLocalDate(new Date(parseInt(annee), parseInt(mois), 0)),
    };
  }
  return req.period.current;
}

async function findBudgetForExpense(conn, utilisateurId, categorieId, dateDepense) {
  if (!categorieId) return null;
  const [rows] = await conn.query(
    `SELECT b.*, COALESCE(SUM(d.montant), 0) AS montant_depense
     FROM budgets b
     LEFT JOIN depenses d ON d.categorie_id = b.categorie_id
       AND d.date_depense BETWEEN b.date_debut AND b.date_fin
       AND d.utilisateur_id = b.utilisateur_id
     WHERE b.categorie_id = ? AND b.utilisateur_id = ?
       AND b.date_debut <= ? AND b.date_fin >= ?
     GROUP BY b.id
     ORDER BY FIELD(b.periode_type, 'quotidien', 'hebdomadaire', 'mensuel') ASC
     LIMIT 1`,
    [categorieId, utilisateurId, dateDepense, dateDepense]
  );
  const budget = rows.length > 0 ? rows[0] : null;
  if (budget) {
    budget.montant_utilise = parseFloat(budget.montant_depense);
  }
  return budget;
}

async function checkBudgetNotification(conn, utilisateurId, budgetId, period) {
  const [bUpdated] = await conn.query('SELECT * FROM budgets WHERE id = ?', [budgetId]);
  if (bUpdated.length === 0) return;

  const prevu = parseFloat(bUpdated[0].montant_prevu);

  const [sumRows] = await conn.query(
    `SELECT COALESCE(SUM(montant), 0) AS total FROM depenses
     WHERE categorie_id = ? AND utilisateur_id = ?
       AND date_depense BETWEEN ? AND ?`,
    [bUpdated[0].categorie_id, utilisateurId, bUpdated[0].date_debut, bUpdated[0].date_fin]
  );
  const used = parseFloat(sumRows[0].total);
  if (used < prevu) return;

  const [catRows] = await conn.query('SELECT libelle FROM categories WHERE id = ?', [bUpdated[0].categorie_id]);
  const catLibelle = catRows.length > 0 ? catRows[0].libelle : `Catégorie #${bUpdated[0].categorie_id}`;

  const depasse = used > prevu;
  const t = bUpdated[0].periode_type === 'quotidien' ? "aujourd'hui"
    : bUpdated[0].periode_type === 'hebdomadaire' ? 'cette semaine'
    : period ? period.timeContext() : 'ce mois-ci';
  const titre = depasse ? `Budget dépassé : ${catLibelle}` : `Budget épuisé : ${catLibelle}`;
  const type = depasse ? 'danger' : 'warning';
  const message = depasse
    ? `Vous avez dépassé le budget "${catLibelle}" (${prevu.toLocaleString()} XAF) pour ${t}.`
    : `Vous avez utilisé tout le budget "${catLibelle}" (${prevu.toLocaleString()} XAF) pour ${t}.`;

  const [existing] = await conn.query(
    `SELECT id FROM notifications WHERE utilisateur_id = ? AND titre = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1`,
    [utilisateurId, titre]
  );
  if (!existing || existing.length === 0) {
    await creerNotification(utilisateurId, type, titre, message, conn);
    await sendPushToUser(utilisateurId, titre, message, { type: 'budget' });
  }
}

exports.getAll = async (req, res, next) => {
  try {
    const period = getPeriod(req);

    let query = `SELECT d.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone, c.couleur AS categorie_couleur,
                       co.nom_compte, co.type_compte
                FROM depenses d
                LEFT JOIN categories c ON d.categorie_id = c.id
                LEFT JOIN comptes co ON d.compte_id = co.id
                WHERE d.utilisateur_id = ? AND d.date_depense BETWEEN ? AND ?`;
    const params = [req.utilisateurId, period.debut, period.fin];

    query += ` ORDER BY d.date_depense DESC, d.id DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone,
              co.nom_compte, co.type_compte
       FROM depenses d
       LEFT JOIN categories c ON d.categorie_id = c.id
       LEFT JOIN comptes co ON d.compte_id = co.id
       WHERE d.id = ? AND d.utilisateur_id = ?`,
      [req.params.id, req.utilisateurId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Dépense introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { compte_id, categorie_id, libelle, montant, date_depense, lieu, notes } = req.body;
    const confirmed = req.body.confirmed === true;

    await conn.beginTransaction();

    const budget = await findBudgetForExpense(conn, req.utilisateurId, categorie_id, date_depense);

    if (!budget) {
      const [[compte]] = await conn.query(
        'SELECT type_compte, solde_actuel FROM comptes WHERE id = ? AND utilisateur_id = ?',
        [compte_id, req.utilisateurId]
      );
      if (compte && ['momo','especes','autre'].includes(compte.type_compte) && parseFloat(compte.solde_actuel) < montant) {
        await conn.rollback();
        return res.status(400).json({ message: 'Solde insuffisant sur ce compte.' });
      }
    }

    let depassement = 0;
    let compteNom = null;
    if (budget) {
      const used = parseFloat(budget.montant_utilise);
      const prevu = parseFloat(budget.montant_prevu);
      depassement = Math.max(0, parseFloat(montant) - Math.max(0, prevu - used));

      if (depassement > 0) {
        const [[compte]] = await conn.query(
          'SELECT nom_compte FROM comptes WHERE id = ? AND utilisateur_id = ?',
          [compte_id, req.utilisateurId]
        );
        compteNom = compte ? compte.nom_compte : 'votre compte';

        if (!confirmed) {
          await conn.rollback();
          return res.status(409).json({
            warning: true,
            depassement: Math.round(depassement),
            budget_restant: Math.round(Math.max(0, prevu - used)),
            budget_prevu: Math.round(prevu),
            budget_utilise: Math.round(used),
            compte_nom: compteNom,
            message: `Cette dépense dépasse votre budget. ${Math.round(depassement).toLocaleString()} FCFA seront déduits de ${compteNom}. Confirmez-vous ?`
          });
        }

        await conn.query(
          'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ? AND utilisateur_id = ?',
          [depassement, compte_id, req.utilisateurId]
        );
      }
    }

    const [result] = await conn.query(
      'INSERT INTO depenses (utilisateur_id, compte_id, categorie_id, libelle, montant, date_depense, lieu, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.utilisateurId, compte_id, categorie_id || null, libelle, montant, date_depense, lieu || null, notes || null]
    );

    if (budget) {
      await conn.query(
        'UPDATE budgets SET montant_utilise = montant_utilise + ? WHERE id = ?',
        [montant, budget.id]
      );
    } else {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ? AND utilisateur_id = ?',
        [montant, compte_id, req.utilisateurId]
      );
    }

    await conn.commit();

    const t = req.period ? req.period.timeContext() : 'ce mois-ci';
    const compareT = req.period ? req.period.compareLabel() : 'le mois dernier';

    if (budget) {
      await checkBudgetNotification(conn, req.utilisateurId, budget.id, req.period);

      if (depassement > 0) {
        const [[catRow]] = await conn.query('SELECT libelle FROM categories WHERE id = ?', [categorieId]);
        const catLibelle = catRow ? catRow.libelle : `Catégorie #${categorieId}`;
        const titre = `Dépassement budget : ${catLibelle}`;
        const message = `Votre budget "${catLibelle}" est épuisé. ${Math.round(depassement).toLocaleString()} FCFA ont été déduits de ${compteNom} pour couvrir le dépassement.`;
        await creerNotification(req.utilisateurId, 'warning', titre, message, conn);
        await sendPushToUser(req.utilisateurId, titre, message, { type: 'depassement' });
      }
    }

    const [rows] = await pool.query('SELECT * FROM depenses WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.update = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { compte_id, categorie_id, libelle, montant, date_depense, lieu, notes } = req.body;

    const [old] = await conn.query(
      'SELECT id, montant, compte_id, categorie_id, date_depense FROM depenses WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (old.length === 0) return res.status(404).json({ message: 'Dépense introuvable.' });

    const oldMontant = parseFloat(old[0].montant);
    const oldCompteId = old[0].compte_id;
    const oldCategorieId = old[0].categorie_id;
    const oldDateDepense = old[0].date_depense;

    await conn.beginTransaction();

    const oldBudget = await findBudgetForExpense(conn, req.utilisateurId, oldCategorieId, oldDateDepense);
    const newBudget = await findBudgetForExpense(conn, req.utilisateurId, categorie_id, date_depense);

    if (!newBudget) {
      const [[compte]] = await conn.query(
        'SELECT type_compte, solde_actuel FROM comptes WHERE id = ? AND utilisateur_id = ?',
        [compte_id, req.utilisateurId]
      );
      if (compte && ['momo','especes','autre'].includes(compte.type_compte)) {
        let soldeDispo = parseFloat(compte.solde_actuel);
        if (oldBudget) {
          if (oldCompteId === compte_id) soldeDispo += parseFloat(oldMontant);
        } else {
          if (oldCompteId === compte_id) soldeDispo += parseFloat(oldMontant);
        }
        if (soldeDispo < montant) {
          await conn.rollback();
          return res.status(400).json({ message: 'Solde insuffisant sur ce compte.' });
        }
      }
    }

    await conn.query(
      'UPDATE depenses SET compte_id = ?, categorie_id = ?, libelle = ?, montant = ?, date_depense = ?, lieu = ?, notes = ? WHERE id = ? AND utilisateur_id = ?',
      [compte_id, categorie_id || null, libelle, montant, date_depense, lieu || null, notes || null, req.params.id, req.utilisateurId]
    );

    if (oldBudget) {
      await conn.query(
        'UPDATE budgets SET montant_utilise = GREATEST(0, montant_utilise - ?) WHERE id = ?',
        [oldMontant, oldBudget.id]
      );
    } else {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel + ? WHERE id = ? AND utilisateur_id = ?',
        [oldMontant, oldCompteId, req.utilisateurId]
      );
    }

    if (newBudget) {
      await conn.query(
        'UPDATE budgets SET montant_utilise = montant_utilise + ? WHERE id = ?',
        [montant, newBudget.id]
      );
    } else {
      await conn.query(
        'UPDATE comptes SET solde_actuel = solde_actuel - ? WHERE id = ? AND utilisateur_id = ?',
        [montant, compte_id, req.utilisateurId]
      );
    }

    await conn.commit();

    if (newBudget) {
      await checkBudgetNotification(conn, req.utilisateurId, newBudget.id, req.period);
    }

    const [rows] = await pool.query('SELECT * FROM depenses WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.remove = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [old] = await conn.query(
      'SELECT id, montant, compte_id, categorie_id, date_depense FROM depenses WHERE id = ? AND utilisateur_id = ?',
      [req.params.id, req.utilisateurId]
    );
    if (old.length === 0) return res.status(404).json({ message: 'Dépense introuvable.' });

    await conn.beginTransaction();

    const budget = await findBudgetForExpense(conn, req.utilisateurId, old[0].categorie_id, old[0].date_depense);

    await conn.query('DELETE FROM depenses WHERE id = ?', [req.params.id]);

    if (budget) {
      await conn.query(
        'UPDATE budgets SET montant_utilise = GREATEST(0, montant_utilise - ?) WHERE id = ?',
        [old[0].montant, budget.id]
      );
    } else {
      try {
        const [updateResult] = await conn.query(
          'UPDATE comptes SET solde_actuel = solde_actuel + ? WHERE id = ? AND utilisateur_id = ?',
          [old[0].montant, old[0].compte_id, req.utilisateurId]
        );
        if (updateResult.affectedRows === 0) {
          console.warn(`Suppression dépense ${req.params.id}: compte ${old[0].compte_id} introuvable, solde non rétabli.`);
        }
      } catch (updateErr) {
        console.warn(`Suppression dépense ${req.params.id}: erreur mise à jour solde compte ${old[0].compte_id}:`, updateErr.message);
      }
    }

    await conn.commit();
    res.json({ message: 'Dépense supprimée.', id: parseInt(req.params.id) });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
