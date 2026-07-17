const pool = require('../config/database');

async function detecterTendances(utilisateurId) {
  const [rows] = await pool.query(
    `SELECT
      c.id AS categorie_id, c.libelle, c.icone, c.couleur,
      YEARWEEK(d.date_depense, 1) AS semaine,
      SUM(d.montant) AS total
     FROM depenses d
     JOIN categories c ON d.categorie_id = c.id
     WHERE d.utilisateur_id = ?
       AND d.date_depense >= DATE_SUB(CURDATE(), INTERVAL 3 WEEK)
     GROUP BY c.id, YEARWEEK(d.date_depense, 1)
     ORDER BY c.id, semaine`,
    [utilisateurId]
  );

  if (rows.length === 0) return [];

  const epargne = await getEpargneMensuelle(utilisateurId);
  const seuilEpargne = epargne * 0.20;

  const parCategorie = {};
  for (const row of rows) {
    if (!parCategorie[row.categorie_id]) {
      parCategorie[row.categorie_id] = {
        categorie_id: row.categorie_id,
        libelle: row.libelle,
        icone: row.icone,
        couleur: row.couleur,
        semaines: [],
      };
    }
    parCategorie[row.categorie_id].semaines.push({
      semaine: row.semaine,
      total: parseFloat(row.total),
    });
  }

  const alertes = [];

  for (const cat of Object.values(parCategorie)) {
    const semaines = cat.semaines.sort((a, b) => a.semaine - b.semaine);
    if (semaines.length < 2) continue;

    let hausseConsecutive = 0;
    let premiereHausse = null;
    let derniereHausse = null;

    for (let i = 1; i < semaines.length; i++) {
      if (semaines[i].total > semaines[i - 1].total) {
        if (premiereHausse === null) premiereHausse = semaines[i - 1];
        derniereHausse = semaines[i];
        hausseConsecutive++;
      } else {
        if (hausseConsecutive >= 2) break;
        hausseConsecutive = 0;
        premiereHausse = null;
        derniereHausse = null;
      }
    }

    if (hausseConsecutive < 2) continue;

    const montantPrecedent = premiereHausse ? premiereHausse.total : semaines[0].total;
    const montantActuel = derniereHausse.total;
    const montantAugmentation = montantActuel - montantPrecedent;
    const pourcentageAugmentation = montantPrecedent > 0
      ? Math.round((montantAugmentation / montantPrecedent) * 100)
      : 0;

    if (epargne > 0 && montantAugmentation > seuilEpargne) {
      alertes.push({
        categorie_id: cat.categorie_id,
        libelle: cat.libelle,
        icone: cat.icone,
        couleur: cat.couleur,
        montant_actuel: montantActuel,
        montant_precedent: montantPrecedent,
        montant_augmentation: montantAugmentation,
        pourcentage_augmentation: pourcentageAugmentation,
        semaines_hausse: hausseConsecutive,
        message: `Vos dépenses en ${cat.icone} ${cat.libelle} augmentent depuis ${hausseConsecutive} semaines. Cette semaine : ${formatMontant(montantActuel)} FCFA, soit ${formatMontant(montantAugmentation)} FCFA de plus qu'il y a ${hausseConsecutive} semaines.`,
      });
    } else if (epargne === 0) {
      alertes.push({
        categorie_id: cat.categorie_id,
        libelle: cat.libelle,
        icone: cat.icone,
        couleur: cat.couleur,
        montant_actuel: montantActuel,
        montant_precedent: montantPrecedent,
        montant_augmentation: montantAugmentation,
        pourcentage_augmentation: pourcentageAugmentation,
        semaines_hausse: hausseConsecutive,
        message: `Vos dépenses en ${cat.icone} ${cat.libelle} augmentent depuis ${hausseConsecutive} semaines. Cette semaine : ${formatMontant(montantActuel)} FCFA, soit ${formatMontant(montantAugmentation)} FCFA de plus qu'il y a ${hausseConsecutive} semaines.`,
      });
    }
  }

  return alertes;
}

async function genererRecommandations(utilisateurId, categorieId) {
  const [[categorie]] = await pool.query(
    'SELECT id, libelle, icone FROM categories WHERE id = ? AND utilisateur_id = ?',
    [categorieId, utilisateurId]
  );

  if (!categorie) return ['Catégorie introuvable.'];

  const now = new Date();
  const debut = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const fin = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  const [[budget]] = await pool.query(
    'SELECT montant_prevu, montant_utilise FROM budgets WHERE utilisateur_id = ? AND categorie_id = ? AND mois = ? AND annee = ? LIMIT 1',
    [utilisateurId, categorieId, now.getMonth() + 1, now.getFullYear()]
  );

  const [[depensesCat]] = await pool.query(
    'SELECT COALESCE(SUM(montant), 0) AS total FROM depenses WHERE utilisateur_id = ? AND categorie_id = ? AND date_depense BETWEEN ? AND ?',
    [utilisateurId, categorieId, debut, fin]
  );

  const objectifs = await pool.query(
    'SELECT titre, montant_cible, montant_actuel, date_limite FROM objectifs_epargne WHERE utilisateur_id = ? AND statut = "en_cours"',
    [utilisateurId]
  );
  const oList = Array.isArray(objectifs[0]) ? objectifs[0] : [];

  const epargneMensuelle = await getEpargneMensuelle(utilisateurId);

  const recommandations = [];
  const montantDepenses = parseFloat(depensesCat.total) || 0;

  if (budget) {
    const prevu = parseFloat(budget.montant_prevu) || 0;
    const utilise = parseFloat(budget.montant_utilise) || 0;
    const reste = Math.max(0, prevu - utilise);
    const joursRestants = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

    if (montantDepenses > prevu) {
      recommandations.push(
        `Votre budget ${categorie.libelle} est de ${formatMontant(prevu)} FCFA/mois. Vous avez déjà dépensé ${formatMontant(montantDepenses)} FCFA. En réduisant de ${formatMontant(Math.round(montantDepenses - prevu))} FCFA ce mois, vous retrouverez dans votre budget.`
      );
    } else {
      recommandations.push(
        `Votre budget ${categorie.libelle} est de ${formatMontant(prevu)} FCFA/mois. Vous avez utilisé ${formatMontant(montantDepenses)} FCFA. Il reste ${formatMontant(reste)} FCFA disponible pour ${joursRestants} jours.`
      );
    }
  } else {
    recommandations.push(
      `Vous n'avez pas encore de budget pour ${categorie.libelle}. Créer un budget vous aidera à contrôler vos dépenses dans cette catégorie.`
    );
  }

  if (oList.length > 0) {
    const obj = oList[0];
    const manquant = Math.max(0, parseFloat(obj.montant_cible) - parseFloat(obj.montant_actuel));
    if (manquant > 0 && epargneMensuelle > 0) {
      const reductionParSemaine = Math.round((montantDepenses * 0.15) / 4);
      const tempsGagneMois = reductionParSemaine > 0
        ? Math.ceil(manquant / (epargneMensuelle + reductionParSemaine * 4))
        : Math.ceil(manquant / epargneMensuelle);
      const tempsSansReduction = Math.ceil(manquant / epargneMensuelle);
      const gainMois = tempsSansReduction - tempsGagneMois;

      recommandations.push(
        `Votre objectif "${obj.titre}" manque ${formatMontant(manquant)} FCFA. En réduisant ${categorie.libelle} de ${formatMontant(reductionParSemaine)} FCFA/semaine, vous l'atteindrez ${gainMois > 0 ? gainMois + ' mois plus tôt' : 'plus rapidement'}.`
      );
    }
  }

  const tauxEpargne = epargneMensuelle > 0 ? Math.round((epargneMensuelle / (epargneMensuelle + montantDepenses || 1)) * 100) : 0;
  if (tauxEpargne > 0) {
    recommandations.push(
      `Votre taux d'épargne actuel est de ${tauxEpargne}%. Réduire ${categorie.libelle} de 15% améliorera ce taux et vous rapprochera de vos objectifs.`
    );
  }

  return recommandations.length > 0 ? recommandations : [
    `Continuez à suivre vos dépenses en ${categorie.libelle} pour garder le contrôle.`
  ];
}

async function getEpargneMensuelle(utilisateurId) {
  const now = new Date();
  const debut = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const fin = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  const [[rev]] = await pool.query(
    'SELECT COALESCE(SUM(montant), 0) AS total FROM revenus WHERE utilisateur_id = ? AND date_revenu BETWEEN ? AND ?',
    [utilisateurId, debut, fin]
  );
  const [[dep]] = await pool.query(
    'SELECT COALESCE(SUM(montant), 0) AS total FROM depenses WHERE utilisateur_id = ? AND date_depense BETWEEN ? AND ?',
    [utilisateurId, debut, fin]
  );

  return parseFloat(rev.total) - parseFloat(dep.total);
}

function formatMontant(n) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

module.exports = { detecterTendances, genererRecommandations };
