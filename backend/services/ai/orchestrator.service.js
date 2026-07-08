const intentService = require('../../ai/intent.service');
const promptService = require('../../ai/prompt.service');
const tools = require('./tools/index');

/* ═══════════════════════════════════════════
   Journalisation
   ═══════════════════════════════════════════ */
const log = [];

function addLog(category, message) {
  const entry = `[${category}] ${message}`;
  log.push(entry);
  console.log(`[ORCHESTRATOR] ${entry}`);
}

function clearLog() {
  log.length = 0;
}

/* ═══════════════════════════════════════════
   Mapping intention → outils
   ═══════════════════════════════════════════ */
const INTENT_TOOLS = {
  budget:    ['getBudgets'],
  depenses:  ['getExpenses'],
  revenus:   ['getRevenues'],
  comptes:   ['getAccounts'],
  objectifs: ['getGoals'],
  analyse:   ['getStatistics', 'getBudgets', 'getExpenses', 'getGoals', 'getAccounts'],
  create_budget:   [],
  create_objectif: [],
};

/* ═══════════════════════════════════════════
   Mapping intention → clé de prompt
   ═══════════════════════════════════════════ */
const INTENT_PROMPTS = {
  budget:         'budget',
  depenses:       'expenses',
  revenus:        'revenues',
  comptes:        null,
  objectifs:      'goals',
  analyse:        'analysis',
  create_budget:  'budget',
  create_objectif:'goals',
};

/* ═══════════════════════════════════════════
   Formateurs de réponse locale
   ═══════════════════════════════════════════ */
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'XAF',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatBudgetResponse(data) {
  if (!data || data.length === 0) {
    return "Vous n'avez pas encore de budget pour ce mois.";
  }
  const totalPrevu = data.reduce((s, b) => s + b.prevu, 0);
  const totalUtilise = data.reduce((s, b) => s + b.utilise, 0);
  const depasses = data.filter((b) => b.depasse);

  let text = `Vous avez **${data.length} budget(s)** pour ce mois.\n`;
  text += `Total prévu : **${fmt(totalPrevu)}** — utilisé : **${fmt(totalUtilise)}**\n\n`;

  for (const b of data) {
    const pct = b.prevu > 0 ? Math.round((b.utilise / b.prevu) * 100) : 0;
    text += `${b.icone || '📊'} **${b.categorie}** : ${fmt(b.utilise)} / ${fmt(b.prevu)} (${pct} %)`;
    if (b.depasse) {
      text += ` ⚠️ *dépassé de ${fmt(Math.abs(b.restant))}*`;
    } else {
      text += ` — reste **${fmt(b.restant)}**`;
    }
    text += '\n';
  }

  if (depasses.length > 0) {
    text += `\n⚠️ **${depasses.length} budget(s) dépassé(s).**`;
    for (const d of depasses) {
      text += `\n- ${d.categorie} : +${fmt(Math.abs(d.restant))}`;
    }
  }

  return text;
}

function formatExpensesResponse(data) {
  if (!data || data.length === 0) {
    return "Vous n'avez pas encore de dépenses ce mois-ci.";
  }
  const total = data.reduce((s, d) => s + d.montant, 0);
  const cats = {};
  for (const d of data) {
    const key = d.categorie || 'Non catégorisé';
    if (!cats[key]) cats[key] = { icone: d.icone || '💸', total: 0, count: 0 };
    cats[key].total += d.montant;
    cats[key].count += 1;
  }
  const sortedCats = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);

  let text = `Vous avez **${data.length} dépense(s)** ce mois-ci pour un total de **${fmt(total)}**.\n\n`;
  text += '**Principales catégories :**\n';
  for (const [cat, info] of sortedCats.slice(0, 5)) {
    const pct = total > 0 ? Math.round((info.total / total) * 100) : 0;
    text += `- ${info.icone} ${cat} : ${fmt(info.total)} (${pct} %, ${info.count} opération(s))\n`;
  }

  const max = data.reduce((a, b) => (a.montant > b.montant ? a : b), data[0]);
  text += `\nPlus grande dépense : **${max.libelle}** — ${fmt(max.montant)} (${max.categorie})`;

  return text;
}

function formatRevenuesResponse(data, total) {
  if (!data || data.length === 0) {
    return "Vous n'avez pas encore de revenus enregistrés ce mois-ci.";
  }
  let text = `Vous avez **${data.length} source(s) de revenus** ce mois-ci pour un total de **${fmt(total)}**.\n\n`;
  for (const r of data) {
    const pct = total > 0 ? Math.round((r.montant / total) * 100) : 0;
    text += `- ${r.icone || '💰'} **${r.libelle}** : ${fmt(r.montant)} (${pct} %)`;
    if (r.recurrent) text += ' 🔄 récurrent';
    text += '\n';
  }
  const regulier = data.filter((r) => r.recurrent).reduce((s, r) => s + r.montant, 0);
  const partReg = total > 0 ? Math.round((regulier / total) * 100) : 0;
  text += `\nRevenus réguliers : **${fmt(regulier)}** (${partReg} % du total)`;
  return text;
}

function formatAccountsResponse(data) {
  if (!data || data.length === 0) {
    return "Vous n'avez pas encore de compte bancaire.";
  }
  const total = data.reduce((s, c) => s + c.solde, 0);
  let text = `Vous avez **${data.length} compte(s)** pour un solde total de **${fmt(total)}**.\n\n`;
  for (const c of data) {
    const icones = { courant: '🏦', epargne: '💰', epgargne: '💰', especes: '💵', mobile: '📱' };
    const ico = icones[c.type] || '🏦';
    text += `- ${ico} **${c.nom}** : ${fmt(c.solde)} (${c.type})\n`;
  }
  return text;
}

function formatGoalsResponse(data) {
  if (!data || data.length === 0) {
    return "Vous n'avez pas encore d'objectif d'épargne.";
  }
  const totalEpargne = data.reduce((s, o) => s + o.actuel, 0);
  const totalCible = data.reduce((s, o) => s + o.cible, 0);
  let text = `Vous avez **${data.length} objectif(s) d'épargne**.\n`;
  text += `Total épargné : **${fmt(totalEpargne)}** sur **${fmt(totalCible)}**\n\n`;

  for (const o of data) {
    const etat = o.statut === 'atteint' ? ' ✅ Atteint !' : ` — reste ${fmt(o.restant)}`;
    text += `- ${o.icone || '🎯'} **${o.titre}** : ${fmt(o.actuel)} / ${fmt(o.cible)} (${o.progression} %)${etat}\n`;
  }
  return text;
}

function formatAnalysisResponse(stats, budgets, expenses, goals, accounts) {
  let text = 'Voici le bilan complet de vos finances.\n\n';

  /* ── Résumé ── */
  if (stats) {
    text += `**Revenus** : ${fmt(stats.revenus)}\n`;
    text += `**Dépenses** : ${fmt(stats.depenses)}\n`;
    text += `**Épargne** : ${fmt(stats.epargne)} (${stats.taux_progression} % des objectifs)\n`;
    text += `**Budget utilisé** : ${fmt(stats.budget.utilise)} / ${fmt(stats.budget.prevu)}\n`;
    text += `**Comptes** : ${stats.comptes.total} compte(s) — ${fmt(stats.comptes.solde_total)}\n`;
    text += `**Objectifs** : ${stats.objectifs.total} objectif(s) — ${fmt(stats.objectifs.epargne)} épargnés\n\n`;
  }

  /* ── Budgets ── */
  if (budgets && budgets.length > 0) {
    const depasses = budgets.filter((b) => b.depasse);
    text += `**Budgets** : ${budgets.length} actif(s)`;
    if (depasses.length > 0) text += `, dont ${depasses.length} dépassé(s)`;
    text += '\n';
    for (const b of budgets.slice(0, 3)) {
      text += `- ${b.categorie} : ${fmt(b.utilise)} / ${fmt(b.prevu)}${b.depasse ? ' ⚠️' : ''}\n`;
    }
    if (budgets.length > 3) text += `  … et ${budgets.length - 3} autre(s)\n`;
    text += '\n';
  }

  /* ── Dépenses ── */
  if (expenses && expenses.length > 0) {
    const total = expenses.reduce((s, d) => s + d.montant, 0);
    text += `**Dépenses** : ${expenses.length} opération(s) — ${fmt(total)}\n`;
    const cats = {};
    for (const d of expenses) {
      const key = d.categorie || 'Autre';
      cats[key] = (cats[key] || 0) + d.montant;
    }
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [cat, montant] of top) {
      const pct = total > 0 ? Math.round((montant / total) * 100) : 0;
      text += `- ${cat} : ${fmt(montant)} (${pct} %)\n`;
    }
    text += '\n';
  }

  /* ── Objectifs ── */
  if (goals && goals.length > 0) {
    const atteints = goals.filter((o) => o.statut === 'atteint');
    text += `**Objectifs** : ${goals.length} objectif(s)`;
    if (atteints.length > 0) text += `, ${atteints.length} atteint(s) 🎉`;
    text += '\n';
    for (const o of goals.slice(0, 3)) {
      text += `- ${o.titre} : ${o.progression} % — reste ${fmt(o.restant)}\n`;
    }
  }

  return text;
}

function formatCreateAction(intent) {
  if (intent === 'create_budget') {
    return 'Je peux vous aider à créer un budget. Rendez-vous dans la section Budgets pour le configurer.';
  }
  if (intent === 'create_objectif') {
    return 'Je peux vous aider à créer un objectif d\'épargne. Rendez-vous dans la section Objectifs pour le définir.';
  }
  return null;
}

/* ═══════════════════════════════════════════
   Construction du contexte complet
   (pour le fallback OpenAI)
   ═══════════════════════════════════════════ */
async function buildFullContext(utilisateurId) {
  const parts = [];

  const stats = await tools.executeTool('getStatistics', utilisateurId);
  if (stats.success && stats.data) {
    const d = stats.data;
    parts.push(`REVENUS: ${d.revenus} XAF | DÉPENSES: ${d.depenses} XAF | ÉPARGNE: ${d.epargne} XAF`);
    parts.push(`BUDGET: ${d.budget.utilise}/${d.budget.prevu} XAF utilisé | COMPTES: ${d.comptes.total} (${d.comptes.solde_total} XAF)`);
    parts.push(`OBJECTIFS: ${d.objectifs.total} (${d.objectifs.epargne}/${d.objectifs.cible} XAF)`);
  }

  const budgets = await tools.executeTool('getBudgets', utilisateurId);
  if (budgets.success && budgets.data?.length > 0) {
    parts.push('BUDGETS:');
    for (const b of budgets.data.slice(0, 5)) {
      parts.push(`- ${b.categorie}: ${b.utilise}/${b.prevu} XAF${b.depasse ? ' DÉPASSÉ' : ''}`);
    }
  }

  const expenses = await tools.executeTool('getExpenses', utilisateurId);
  if (expenses.success && expenses.data?.length > 0) {
    const total = expenses.data.reduce((s, d) => s + d.montant, 0);
    parts.push(`DÉPENSES: ${expenses.data.length} opérations (${total} XAF)`);
  }

  const goals = await tools.executeTool('getGoals', utilisateurId);
  if (goals.success && goals.data?.length > 0) {
    parts.push('OBJECTIFS:');
    for (const o of goals.data.slice(0, 3)) {
      parts.push(`- ${o.titre}: ${o.actuel}/${o.cible} XAF (${o.progression} %)`);
    }
  }

  return parts.join('\n');
}

/* ═══════════════════════════════════════════
   Réponse locale (sans OpenAI)
   ═══════════════════════════════════════════ */
function buildLocalResponse(intent, toolResults) {
  switch (intent) {
    case 'budget':
      return formatBudgetResponse(toolResults.getBudgets?.data || []);
    case 'depenses':
      return formatExpensesResponse(toolResults.getExpenses?.data || []);
    case 'revenus': {
      const r = toolResults.getRevenues;
      return formatRevenuesResponse(r?.data || [], r?.total || 0);
    }
    case 'comptes':
      return formatAccountsResponse(toolResults.getAccounts?.data || []);
    case 'objectifs':
      return formatGoalsResponse(toolResults.getGoals?.data || []);
    case 'analyse':
      return formatAnalysisResponse(
        toolResults.getStatistics?.data,
        toolResults.getBudgets?.data,
        toolResults.getExpenses?.data,
        toolResults.getGoals?.data,
        toolResults.getAccounts?.data,
      );
    case 'create_budget':
    case 'create_objectif':
      return formatCreateAction(intent);
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════
   API publique
   ═══════════════════════════════════════════ */

async function processMessage(utilisateurId, message, historique = []) {
  const start = Date.now();
  clearLog();

  try {
    addLog('INPUT', `Message: "${message.substring(0, 80)}..."`);

    /* ── 1. Analyse d'intention ── */
    const intention = intentService.analyzeIntent(message);
    addLog('INTENT', `${intention.intent} (confiance: ${intention.confidence})`);

    let reponse = null;
    let contexte = null;
    let pretPourOpenAI = false;
    const resultatsOutils = {};

    /* ── 2. Routage local vs OpenAI ── */
    if (intention.intent !== 'unknown' && intention.confidence >= 0.6) {
      const outils = INTENT_TOOLS[intention.intent] || [];

      for (const nom of outils) {
        const r = await tools.executeTool(nom, utilisateurId, intention.parameters);
        resultatsOutils[nom] = r;
        addLog('TOOL', `${nom} → ${r.success ? 'OK' : 'FAIL'}`);
      }

      reponse = buildLocalResponse(intention.intent, resultatsOutils);
      addLog('RESPONSE', 'Réponse locale construite');
    } else {
      addLog('FALLBACK', 'Préparation du contexte pour OpenAI');
      contexte = await buildFullContext(utilisateurId);
      pretPourOpenAI = true;
      reponse = null;
    }

    /* ── Fallback si pas de réponse ── */
    if (!reponse && !pretPourOpenAI) {
      reponse = 'Je n\'ai pas bien compris votre demande. Essayez de reformuler ou posez une question sur vos finances.';
    }

    return {
      success: true,
      reponse,
      contexte,
      pret_pour_openai: pretPourOpenAI,
      intention: intention.intent,
      confiance: intention.confidence,
      parametres: intention.parameters,
      outils_utilises: Object.keys(resultatsOutils),
      prompt_selectionne: INTENT_PROMPTS[intention.intent] || null,
      temps_execution: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    addLog('ERROR', err.message);
    return {
      success: false,
      reponse: 'Désolé, une erreur est survenue lors de l\'analyse. Veuillez réessayer.',
      erreur: err.message,
      temps_execution: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = {
  processMessage,
};
