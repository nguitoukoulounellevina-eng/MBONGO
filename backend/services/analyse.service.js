const pool = require('../config/database');
const Period = require('../utils/period');

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
}

async function analyserComplet(utilisateurId, period) {
  const now = new Date();
  if (!period) {
    period = new Period('mensuel', now);
  }

  const { debut, fin } = period.current;
  const prevPeriod = period.previous;
  const tCtx = period.timeContext();

  /* ── Requêtes parallèles ── */
  const [[revRow]] = await pool.query('SELECT COALESCE(SUM(montant),0) AS total FROM revenus WHERE utilisateur_id=? AND date_revenu BETWEEN ? AND ?', [utilisateurId, debut, fin]);
  const [[depRow]] = await pool.query('SELECT COALESCE(SUM(montant),0) AS total FROM depenses WHERE utilisateur_id=? AND date_depense BETWEEN ? AND ?', [utilisateurId, debut, fin]);
  const [[objRow]] = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(montant_actuel),0) AS epargne, COALESCE(SUM(montant_cible),0) AS cible FROM objectifs_epargne WHERE utilisateur_id=?', [utilisateurId]);
  const [[budRow]] = await pool.query('SELECT COALESCE(SUM(montant_utilise),0) AS utilise, COALESCE(SUM(montant_prevu),0) AS prevu FROM budgets WHERE utilisateur_id=? AND date_debut <= ? AND date_fin >= ?', [utilisateurId, fin, debut]);
  const [[compteRow]] = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(solde_actuel),0) AS solde_total FROM comptes WHERE utilisateur_id=?', [utilisateurId]);
  const [revenusRecurrents] = await pool.query('SELECT COUNT(*) AS total FROM revenus WHERE utilisateur_id=? AND recurrent=1', [utilisateurId]);
  const [[revPrec]] = await pool.query('SELECT COALESCE(SUM(montant),0) AS total FROM revenus WHERE utilisateur_id=? AND date_revenu BETWEEN ? AND ?', [utilisateurId, prevPeriod.debut, prevPeriod.fin]);
  const [categories] = await pool.query('SELECT c.id, c.libelle, c.icone, c.couleur, COALESCE(SUM(d.montant),0) AS total FROM depenses d LEFT JOIN categories c ON d.categorie_id=c.id WHERE d.utilisateur_id=? AND d.date_depense BETWEEN ? AND ? GROUP BY d.categorie_id ORDER BY total DESC', [utilisateurId, debut, fin]);
  const [budgetsList] = await pool.query(`SELECT b.*, c.libelle AS categorie_libelle, c.icone AS categorie_icone,
    COALESCE((
      SELECT SUM(b2.montant_prevu) FROM budgets b2
      WHERE b2.categorie_id = b.categorie_id
        AND b2.utilisateur_id = b.utilisateur_id
        AND b2.periode_type IN ('quotidien','hebdomadaire')
        AND b2.date_debut >= b.date_debut
        AND b2.date_fin <= b.date_fin
        AND b2.id != b.id
    ), 0) AS montant_reserve
    FROM budgets b
    LEFT JOIN categories c ON b.categorie_id=c.id
    WHERE b.utilisateur_id=? AND b.date_debut <= ? AND b.date_fin >= ?`, [utilisateurId, fin, debut]);
  const [objectifsList] = await pool.query('SELECT * FROM objectifs_epargne WHERE utilisateur_id=?', [utilisateurId]);
  const [[depToday]] = await pool.query('SELECT COALESCE(SUM(montant),0) AS total FROM depenses WHERE utilisateur_id=? AND DATE(date_depense)=CURDATE()', [utilisateurId]);
  const [[depWeek]] = await pool.query('SELECT COALESCE(SUM(montant),0) AS total FROM depenses WHERE utilisateur_id=? AND YEARWEEK(date_depense,1)=YEARWEEK(CURDATE(),1)', [utilisateurId]);

  const revenus = parseFloat(revRow.total) || 0;
  const depenses = parseFloat(depRow.total) || 0;
  const epargne = parseFloat(objRow.epargne) || 0;
  const objectifCible = parseFloat(objRow.cible) || 0;
  const solde = parseFloat(compteRow.solde_total) || 0;
  const budgetUtilise = parseFloat(budRow.utilise) || 0;
  const budgetPrevu = parseFloat(budRow.prevu) || 0;
  const revenusPrec = parseFloat(revPrec.total) || 0;
  const depensesAujourdhui = parseFloat(depToday.total) || 0;
  const depensesSemaine = parseFloat(depWeek.total) || 0;
  const tauxEpargne = revenus > 0 ? Math.round(((revenus - depenses) / revenus) * 100) : 0;
  const capaciteEpargne = Math.max(0, revenus - depenses);

  /* ══════════════════════════════════════
     1. RÉSUMÉ GÉNÉRAL
     ══════════════════════════════════════ */
  const resume = {
    revenus,
    depenses,
    depenses_aujourdhui: depensesAujourdhui,
    depenses_semaine: depensesSemaine,
    solde,
    taux_epargne: tauxEpargne,
    periode: `${tCtx}`,
  };

  /* ══════════════════════════════════════
     2. ANALYSE DES DÉPENSES
     ══════════════════════════════════════ */
  const topCategories = categories.map(c => ({
    id: c.id,
    libelle: c.libelle || 'Sans catégorie',
    icone: c.icone || '📦',
    couleur: c.couleur || '#9090A8',
    montant: parseFloat(c.total) || 0,
    pourcentage: depenses > 0 ? Math.round((parseFloat(c.total) / depenses) * 100) : 0,
  }));

  const depensesInhabituelles = [];
  for (const cat of categories) {
    const catId = cat.id;
    if (!catId) continue;
    const [allCat] = await pool.query('SELECT COUNT(*) AS cnt, AVG(montant) AS avg_montant FROM depenses WHERE utilisateur_id=? AND categorie_id=? AND date_depense BETWEEN ? AND ?', [utilisateurId, catId, debut, fin]);
    const avg = parseFloat(allCat[0]?.avg_montant) || 0;
    const [recentes] = await pool.query('SELECT id, libelle, montant, date_depense FROM depenses WHERE utilisateur_id=? AND categorie_id=? AND date_depense BETWEEN ? AND ? ORDER BY date_depense DESC LIMIT 5', [utilisateurId, catId, debut, fin]);
    for (const d of recentes) {
      const mt = parseFloat(d.montant) || 0;
      if (avg > 0 && mt > avg * 2 && mt > 30000) {
        depensesInhabituelles.push({
          libelle: d.libelle || 'Dépense',
          montant: mt,
          categorie: cat.libelle || 'Non catégorisé',
          moyenne: Math.round(avg),
          date: d.date_depense,
        });
      }
    }
  }

  const depassementsBudget = [];
  for (const b of budgetsList) {
    const utilise = parseFloat(b.montant_utilise) || 0;
    const reserve = parseFloat(b.montant_reserve) || 0;
    const prevu = parseFloat(b.montant_prevu) || 0;
    if (prevu > 0 && (utilise + reserve) > prevu) {
      depassementsBudget.push({
        categorie: b.categorie_libelle || 'Budget',
        icone: b.categorie_icone || '📊',
        prevu,
        utilise,
        reserve,
        depassement: utilise + reserve - prevu,
      });
    }
  }

  const insightsDepenses = [];
  if (topCategories.length > 0) {
    const top = topCategories[0];
    insightsDepenses.push(`Vous avez consacré **${top.pourcentage}%** de vos dépenses à **${top.libelle}**, ce qui représente votre poste de dépense principal.`);
  }
  if (topCategories.length > 1) {
    const second = topCategories[1];
    insightsDepenses.push(`Le second poste de dépense est **${second.libelle}** avec **${fmt(second.montant)} FCFA** (${second.pourcentage}%).`);
  }
  if (depenses === 0) {
    insightsDepenses.push(`Aucune dépense enregistrée ${tCtx}.`);
  }

  const analyseDepenses = {
    top_categories: topCategories.slice(0, 5),
    depenses_inhabituelles: depensesInhabituelles,
    depassements_budget: depassementsBudget,
    insights: insightsDepenses,
  };

  /* ══════════════════════════════════════
     3. ANALYSE DES REVENUS
     ══════════════════════════════════════ */
  const nbRecurrents = parseInt(revenusRecurrents[0]?.total) || 0;
  const evolution = revenusPrec > 0 ? Math.round(((revenus - revenusPrec) / revenusPrec) * 100) : 0;
  const stable = nbRecurrents > 0;
  const couvreDepenses = revenus >= depenses;

  const compareT = period.compareLabel();
  const insightsRevenus = [];
  if (stable) {
    insightsRevenus.push('Vos revenus sont **stables** grâce à des sources récurrentes.');
  } else {
    insightsRevenus.push('Vos revenus sont **variables**. Pensez à sécuriser des sources régulières.');
  }
  if (revenus > 0 && evolution !== 0) {
    insightsRevenus.push(evolution > 0
      ? `Vos revenus ont **augmenté de ${evolution}%** par rapport à ${compareT}.`
      : `Vos revenus ont **baissé de ${Math.abs(evolution)}%** par rapport à ${compareT}.`);
  }
  if (couvreDepenses) {
    insightsRevenus.push('Vos revenus **couvrent** vos dépenses.');
  } else {
    insightsRevenus.push('Vos revenus **ne couvrent pas** vos dépenses. Une réduction des dépenses est nécessaire.');
  }

  const analyseRevenus = {
    total: revenus,
    stable,
    evolution,
    couvre_depenses: couvreDepenses,
    insights: insightsRevenus,
  };

  /* ══════════════════════════════════════
     4. ANALYSE DES OBJECTIFS
     ══════════════════════════════════════ */
  const analyseObjectifs = objectifsList
    .filter(o => o.statut !== 'annule')
    .map(o => {
      const cible = parseFloat(o.montant_cible) || 0;
      const actuel = parseFloat(o.montant_actuel) || 0;
      const progression = cible > 0 ? Math.round((actuel / cible) * 100) : 0;
      const restant = Math.max(0, cible - actuel);
      let tempsEstime = null;
      if (progression < 100 && restant > 0) {
        const rythme = capaciteEpargne > 0 ? capaciteEpargne : Math.round(revenus * 0.1);
        const moisEstime = rythme > 0 ? Math.ceil(restant / rythme) : 99;
        if (moisEstime <= 1) tempsEstime = 'moins d\'un mois';
        else if (moisEstime === 1) tempsEstime = '1 mois';
        else tempsEstime = `${moisEstime} mois`;
      }
      return {
        id: o.id,
        titre: o.titre || 'Objectif',
        icone: o.icone || '🎯',
        actuel,
        cible,
        progression,
        restant,
        temps_estime: tempsEstime,
        statut: o.statut || 'en_cours',
      };
    });

  /* ══════════════════════════════════════
     5. POINTS D'ATTENTION
     ══════════════════════════════════════ */
  const [alertesExistantes] = await pool.query(
    `SELECT DISTINCT type, titre FROM notifications 
     WHERE utilisateur_id = ? AND (est_lue = 1 OR created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR))`,
    [utilisateurId]
  );
  const alerteSet = new Set(alertesExistantes.map(a => `${a.type}|${a.titre}`));

  let pointsAttention = [];

  for (const d of depassementsBudget) {
    pointsAttention.push({
      type: 'danger',
      icone: '⚠️',
      titre: `Budget ${d.categorie} dépassé`,
      message: `Vous avez dépassé votre budget **${d.categorie}** de **${fmt(d.depassement)} FCFA**.`,
      route: 'budget',
    });
  }

  if (depenses > 0 && tauxEpargne < 10) {
    pointsAttention.push({
      type: 'danger',
      icone: '🔴',
      titre: "Taux d'épargne très faible",
      message: `Votre taux d'épargne est de **${tauxEpargne}%**. Essayez de réduire vos dépenses pour atteindre au moins 20%.`,
      route: 'budget',
    });
  }

  if (!couvreDepenses) {
    pointsAttention.push({
      type: 'danger',
      icone: '🚨',
      titre: 'Dépenses supérieures aux revenus',
      message: `Vous dépensez **${fmt(depenses)} FCFA** pour **${fmt(revenus)} FCFA** de revenus. Un déficit de **${fmt(depenses - revenus)} FCFA**.`,
      route: 'depenses',
    });
  }

  for (const d of depensesInhabituelles) {
    pointsAttention.push({
      type: 'warning',
      icone: '💡',
      titre: 'Dépense inhabituelle détectée',
      message: `**${d.libelle}** (${fmt(d.montant)} FCFA) est bien au-dessus de votre moyenne de **${fmt(d.moyenne)} FCFA** en ${d.categorie}.`,
      route: 'depenses',
    });
  }

  for (const o of analyseObjectifs) {
    if (o.statut !== 'en_cours') continue;
    if (o.progression >= 90 && o.progression < 100) {
      pointsAttention.push({
        type: 'success',
        icone: '🎉',
        titre: `Objectif "${o.titre}" presque atteint`,
        message: `Plus que **${fmt(o.restant)} FCFA** pour atteindre votre objectif **${o.titre}**.`,
        route: 'objectifs_epargne',
      });
    }
    if (o.date_limite) {
      const dateLimite = new Date(o.date_limite);
      const joursRestants = Math.ceil((dateLimite - now) / (1000 * 60 * 60 * 24));
      if (joursRestants > 0 && joursRestants <= 14) {
        pointsAttention.push({
          type: 'warning',
          icone: '⏰',
          titre: `Échéance imminente : ${o.titre}`,
          message: `Plus que **${joursRestants} jour(s)** avant la date limite de votre objectif **${o.titre}** (${fmt(o.restant)} FCFA restants).`,
          route: 'objectifs_epargne',
        });
      }
    }
  }

  const budgetProches = budgetsList.filter(b => {
    const utilise = parseFloat(b.montant_utilise) || 0;
    const reserve = parseFloat(b.montant_reserve) || 0;
    const prevu = parseFloat(b.montant_prevu) || 0;
    const seuil = (b.alerte_seuil || 80) / 100;
    const effectif = utilise + reserve;
    return prevu > 0 && effectif / prevu >= seuil && effectif < prevu;
  });
  for (const b of budgetProches) {
    const utilise = parseFloat(b.montant_utilise) || 0;
    const reserve = parseFloat(b.montant_reserve) || 0;
    const prevu = parseFloat(b.montant_prevu) || 0;
    const pct = Math.round(((utilise + reserve) / prevu) * 100);
    pointsAttention.push({
      type: 'info',
      icone: '🟡',
      titre: `Budget ${b.categorie_libelle || 'catégorie'} presque épuisé`,
      message: `Votre budget **${b.categorie_libelle || 'catégorie'}** est utilisé à **${pct}%**.`,
      route: 'budget',
    });
  }

  const budgetsEpuises = budgetsList.filter(b => {
    const utilise = parseFloat(b.montant_utilise) || 0;
    const reserve = parseFloat(b.montant_reserve) || 0;
    const prevu = parseFloat(b.montant_prevu) || 0;
    const effectif = utilise + reserve;
    return prevu > 0 && effectif >= prevu;
  });
  for (const b of budgetsEpuises) {
    const utilise = parseFloat(b.montant_utilise) || 0;
    const reserve = parseFloat(b.montant_reserve) || 0;
    const prevu = parseFloat(b.montant_prevu) || 0;
    const pct = Math.round(((utilise + reserve) / prevu) * 100);
    pointsAttention.push({
      type: 'danger',
      icone: '🔴',
      titre: `Budget ${b.categorie_libelle || 'catégorie'} épuisé`,
      message: `Votre budget **${b.categorie_libelle || 'catégorie'}** est totalement épuisé (${pct}%).`,
      route: 'budget',
    });
  }

  /* ── Filtrer les points d'attention déjà notifiés/lus ── */
  pointsAttention = pointsAttention.filter(p => !alerteSet.has(`${p.type}|${p.titre}`));

  /* ══════════════════════════════════════
     6. RECOMMANDATIONS
     ══════════════════════════════════════ */
  const recommandations = [];

  if (tauxEpargne < 20) {
    recommandations.push({
      icone: '💰',
      titre: "Augmenter votre épargne",
      description: `Visez un taux d'épargne d'au moins 20% pour sécuriser votre avenir financier. Actuellement à ${tauxEpargne}%.`,
      route: 'objectifs_epargne',
    });
  }
  if (depenses > 0 && revenus > 0 && (depenses / revenus) > 0.8) {
    recommandations.push({
      icone: '📉',
      titre: 'Réduire vos dépenses',
      description: 'Vous dépensez plus de 80% de vos revenus. Essayez de réduire les catégories non essentielles.',
      route: 'depenses',
    });
  }
  if (topCategories.length > 0 && topCategories[0].pourcentage > 40) {
    recommandations.push({
      icone: topCategories[0].icone,
      titre: `Diversifier vos dépenses`,
      description: `La catégorie "${topCategories[0].libelle}" représente ${topCategories[0].pourcentage}% de vos dépenses. Essayez de mieux répartir votre budget.`,
      route: 'budget',
    });
  }
  if (!couvreDepenses) {
    recommandations.push({
      icone: '💼',
      titre: 'Augmenter vos revenus',
      description: 'Vos dépenses dépassent vos revenus. Cherchez des sources de revenus complémentaires.',
      route: 'revenus',
    });
  }
  if (analyseObjectifs.some(o => o.statut === 'en_cours')) {
    const aEpargner = analyseObjectifs.filter(o => o.statut === 'en_cours').reduce((s, o) => s + o.restant, 0);
    recommandations.push({
      icone: '🎯',
      titre: 'Alimenter vos objectifs',
      description: `Il vous reste **${fmt(aEpargner)} FCFA** à épargner pour atteindre vos objectifs.`,
      route: 'objectifs_epargne',
    });
  }
  if (depassementsBudget.length > 0) {
    recommandations.push({
      icone: '📊',
      titre: 'Ajuster vos budgets',
      description: `${depassementsBudget.length} budget(s) dépassé(s). Augmentez le plafond ou réduisez les dépenses dans ces catégories.`,
      route: 'budget',
    });
  }
  if (analyseObjectifs.length === 0) {
    recommandations.push({
      icone: '🏆',
      titre: 'Créer un objectif financier',
      description: 'Définissez un objectif d\'épargne pour donner un sens à votre gestion financière.',
      route: 'objectifs_epargne',
    });
  }
  if (objectifCible > 0 && epargne >= objectifCible) {
    recommandations.push({
      icone: '🎉',
      titre: 'Félicitations ! Tous les objectifs atteints',
      description: 'Vous avez atteint tous vos objectifs ! Fixez-vous de nouveaux défis.',
      route: 'objectifs_epargne',
    });
  }

  /* ══════════════════════════════════════
     7. SCORE DE SANTÉ FINANCIÈRE
     ══════════════════════════════════════ */
  const scoreTauxEpargne = tauxEpargne >= 30 ? 100 : tauxEpargne >= 20 ? 80 : tauxEpargne >= 10 ? 50 : tauxEpargne >= 5 ? 30 : 10;
  const scoreCouverture = couvreDepenses ? 100 : 0;
  const scoreBudgets = budgetsList.length > 0
    ? Math.round((budgetsList.filter(b => (parseFloat(b.montant_utilise) || 0) + (parseFloat(b.montant_reserve) || 0) <= (parseFloat(b.montant_prevu) || 999999)).length / budgetsList.length) * 100)
    : 80;
  const scoreObjectifs = objectifsList.filter(o => o.statut !== 'annule').length > 0
    ? Math.round(objectifsList.filter(o => o.statut !== 'annule').reduce((s, o) => {
        const c = parseFloat(o.montant_cible) || 0;
        const a = parseFloat(o.montant_actuel) || 0;
        return c > 0 ? s + ((a / c) * 100) : s + 0;
      }, 0) / objectifsList.filter(o => o.statut !== 'annule').length)
    : 0;
  const scoreStabilite = stable ? 100 : 30;
  const scoreFinance = Math.min(100, Math.max(0, Math.round(
    (scoreTauxEpargne * 0.30) +
    (scoreCouverture * 0.20) +
    (scoreBudgets * 0.15) +
    (scoreObjectifs * 0.20) +
    (scoreStabilite * 0.15)
  )));

  let niveau, interpretation, etoiles;
  if (scoreFinance >= 90) { niveau = 'excellent'; interpretation = 'Votre santé financière est excellente.'; etoiles = 5; }
  else if (scoreFinance >= 75) { niveau = 'bon'; interpretation = 'Votre santé financière est bonne.'; etoiles = 4; }
  else if (scoreFinance >= 50) { niveau = 'moyen'; interpretation = 'Votre santé financière est moyenne, des améliorations sont possibles.'; etoiles = 3; }
  else { niveau = 'a_ameliorer'; interpretation = 'Votre santé financière nécessite une attention particulière.'; etoiles = 2; }

  const score = {
    valeur: scoreFinance,
    niveau,
    etoiles,
    interpretation,
    bareme: {
      excellent: '90-100',
      bon: '75-89',
      moyen: '50-74',
      a_ameliorer: '0-49',
    },
  };

  /* ══════════════════════════════════════
     8. CONCLUSION
     ══════════════════════════════════════ */
  let conclusion = '';
  if (revenus === 0 && depenses === 0) {
    conclusion = 'Commencez par enregistrer vos revenus et dépenses pour obtenir une analyse personnalisée de votre situation financière.';
  } else if (scoreFinance >= 75) {
    conclusion = `Votre situation financière est **${niveau}**. Vos revenus couvrent vos dépenses et vous progressez vers vos objectifs.`;
    if (tauxEpargne < 20) conclusion += ` Une légère augmentation de votre taux d'épargne (actuellement ${tauxEpargne}%) renforcerait encore votre situation.`;
    if (analyseObjectifs.length > 0) conclusion += ` Continuez à alimenter vos objectifs pour concrétiser vos projets.`;
  } else if (scoreFinance >= 50) {
    conclusion = `Votre situation financière est **${niveau}**.`;
    if (!couvreDepenses) conclusion += ` Vos dépenses dépassent vos revenus. Priorisez la réduction des dépenses non essentielles.`;
    else conclusion += ` Vous gérez correctement vos finances, mais quelques ajustements peuvent améliorer votre santé financière.`;
    if (tauxEpargne < 10) conclusion += ` Essayez d'atteindre un taux d'épargne d'au moins 10% pour commencer à constituer une épargne de précaution.`;
  } else {
    conclusion = `Votre situation financière nécessite une **attention particulière**.`;
    if (!couvreDepenses) conclusion += ` Vos dépenses (**${fmt(depenses)} FCFA**) sont supérieures à vos revenus (**${fmt(revenus)} FCFA**). Réduisez vos dépenses ou augmentez vos revenus en priorité.`;
    if (tauxEpargne <= 0) conclusion += ` Vous n'épargnez pas actuellement. Même un petit montant régulier fera la différence.`;
    conclusion += ` Commencez par suivre vos dépenses et établir un budget réaliste.`;
  }

  return {
    resume,
    analyse_depenses: analyseDepenses,
    analyse_revenus: analyseRevenus,
    analyse_objectifs: analyseObjectifs,
    points_attention: pointsAttention,
    recommandations: recommandations.slice(0, 6),
    score,
    conclusion,
  };
}

module.exports = { analyserComplet };
