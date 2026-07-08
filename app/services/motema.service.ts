import api from './api';
import { BRIEFING, BriefingData, BriefingAction, RemarqueItem } from './motemaMockData';


const fmt = (n: any) => {
  const num = typeof n === 'string' ? parseFloat(n) : (n || 0);
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/* ── Données brutes ── */

export interface ResumeData {
  revenus?: number;
  depenses?: number;
  epargne?: number;
  ratio_depenses?: number;
  objectif_cible?: number;
  taux_progression?: number;
  budget?: { utilise?: number; prevu?: number; restant?: number };
  comptes?: { total?: number; solde_total?: number };
  objectifs?: { total?: number; epargne?: number; cible?: number };
  top_categories?: { libelle: string; icone: string; couleur: string; total: number }[];
}

/* ── Construction des remarques ── */

function buildRemarques(resume: ResumeData | null, budgets: any[], goals: any[], maxItems?: number): RemarqueItem[] {
  const items: RemarqueItem[] = [];
  const ratio = resume?.ratio_depenses ?? 0;
  const restant = resume?.budget?.restant ?? 0;
  const prevu = resume?.budget?.prevu ?? 0;

  // 1. Verte — point positif
  if (ratio > 0 && ratio < 70) {
    items.push({ emoji: '🟢', color: '#22D3A5', text: `Vous maîtrisez bien vos dépenses : seulement ${ratio}% de vos revenus sont utilisés.` });
  } else if (restant > 0 && prevu > 0) {
    items.push({ emoji: '🟢', color: '#22D3A5', text: `Il vous reste ${fmt(restant)} F sur votre budget mensuel.` });
  } else if (goals.length > 0) {
    const best = goals.reduce((a: any, b: any) => {
      const pa = a.montant_cible > 0 ? (a.montant_actuel / a.montant_cible) * 100 : 0;
      const pb = b.montant_cible > 0 ? (b.montant_actuel / b.montant_cible) * 100 : 0;
      return pb > pa ? b : a;
    });
    const pct = best.montant_cible > 0 ? Math.round((best.montant_actuel / best.montant_cible) * 100) : 0;
    items.push({ emoji: '🟢', color: '#22D3A5', text: `Votre objectif "${best.titre}" est à ${pct}%.` });
  } else if (resume?.comptes?.solde_total) {
    items.push({ emoji: '🟢', color: '#22D3A5', text: `Votre solde total est de ${fmt(resume.comptes.solde_total)} F.` });
  } else {
    items.push({ emoji: '🟢', color: '#22D3A5', text: 'Votre situation financière est stable ce mois-ci.' });
  }

  // 2. Jaune — point d'alerte
  const overrun = budgets.find((b: any) => b.montant_prevu > 0 && b.montant_utilise >= b.montant_prevu * 0.8);
  if (ratio > 80) {
    items.push({ emoji: '🟡', color: '#F59E0B', text: `Attention, vos dépenses représentent ${ratio}% de vos revenus.` });
  } else if (overrun) {
    const pct = Math.round((overrun.montant_utilise / overrun.montant_prevu) * 100);
    items.push({ emoji: '🟡', color: '#F59E0B', text: `Votre budget ${overrun.categorie_libelle || 'catégorie'} atteint ${pct}%.` });
  } else if (goals.length === 0) {
    items.push({ emoji: '🟡', color: '#F59E0B', text: 'Vous n\'avez pas encore créé d\'objectif d\'épargne.' });
  } else if (prevu > 0 && (resume?.budget?.utilise ?? 0) > 0) {
    items.push({ emoji: '🟡', color: '#F59E0B', text: `Vous avez utilisé ${fmt(resume?.budget?.utilise ?? 0)} F sur ${fmt(prevu)} F de budget.` });
  } else {
    items.push({ emoji: '🟡', color: '#F59E0B', text: 'Pensez à vérifier vos budgets pour ce mois.' });
  }

  // 3. Bleue — information
  if (goals.length > 0) {
    const cible = goals.reduce((s: number, g: any) => s + (g.montant_cible || 0), 0);
    const actuel = goals.reduce((s: number, g: any) => s + (g.montant_actuel || 0), 0);
    items.push({ emoji: '🔵', color: '#3B82F6', text: `Vous avez ${goals.length} objectif(s) d'épargne (${fmt(actuel)} F / ${fmt(cible)} F).` });
  } else if (resume?.comptes?.total) {
    items.push({ emoji: '🔵', color: '#3B82F6', text: `Vous avez ${resume.comptes.total} compte(s) pour un solde total de ${fmt(resume.comptes.solde_total || 0)} F.` });
  } else {
    items.push({ emoji: '🔵', color: '#3B82F6', text: `Votre revenu ce mois-ci est de ${fmt(resume?.revenus || 0)} F.` });
  }

  return maxItems ? items.slice(0, maxItems) : items;
}

/* ── Construction des conseils (3) ── */

export type Conseil = { icon: string; title: string; text: string };

function buildConseils(resume: ResumeData | null, analyse: any | null, budgets: any[], goals: any[], maxItems?: number): Conseil[] {
  const ratio = resume?.ratio_depenses ?? 0;
  const conseils: Conseil[] = [];

  // 1. Conseil santé financière
  if (ratio > 80) {
    conseils.push({ icon: '⚠️', title: 'Santé financière', text: `Vos dépenses atteignent ${ratio}% de vos revenus. Réduisez vos charges fixes pour retrouver une marge de manoeuvre.` });
  } else if (ratio > 50) {
    conseils.push({ icon: '📊', title: 'Santé financière', text: `Votre ratio dépenses/revenus est de ${ratio}%. Restez vigilant et évitez les dépenses imprévues.` });
  } else if (ratio > 0) {
    conseils.push({ icon: '🌟', title: 'Santé financière', text: `Seulement ${ratio}% de vos revenus sont dépensés. Vous gérez bien votre budget.` });
  } else {
    conseils.push({ icon: '💡', title: 'Santé financière', text: 'Continuez à suivre vos finances régulièrement pour garder le contrôle.' });
  }

  // 2. Conseil épargne
  if (goals.length > 0) {
    const actuel = goals.reduce((s: number, g: any) => s + (g.montant_actuel || 0), 0);
    const cible = goals.reduce((s: number, g: any) => s + (g.montant_cible || 0), 0);
    const pct = cible > 0 ? Math.round((actuel / cible) * 100) : 0;
    const restant = cible - actuel;
    if (pct < 50) {
      conseils.push({ icon: '🎯', title: 'Épargne', text: `Vous êtes à ${pct}% de votre objectif. Essayez d'économiser au moins ${fmt(Math.round(restant / 6))} F par mois pour accélérer.` });
    } else {
      conseils.push({ icon: '💰', title: 'Épargne', text: `Bonne progression sur vos objectifs (${pct}%). Continuez sur cette lancée !` });
    }
  } else if (ratio > 0 && ratio < 70) {
    const marge = resume?.revenus && resume?.depenses ? resume.revenus - resume.depenses : 0;
    conseils.push({ icon: '💰', title: 'Épargne', text: `Vous avez une marge de ${fmt(marge)} F. Ouvrez un objectif d'épargne pour mettre cet argent de côté.` });
  } else {
    conseils.push({ icon: '💡', title: 'Épargne', text: `Mettre ne serait-ce que 5 000 F de côté chaque mois peut faire la différence sur l'année.` });
  }

  // 3. Conseil budget
  const alertBudget = budgets.find((b: any) => b.montant_prevu > 0 && b.montant_utilise >= b.montant_prevu * 0.8);
  if (alertBudget) {
    const pct = Math.round((alertBudget.montant_utilise / alertBudget.montant_prevu) * 100);
    conseils.push({ icon: '🚨', title: 'Budget', text: `Votre budget ${alertBudget.categorie_libelle || 'catégorie'} atteint ${pct}%. Réajustez vos dépenses ou réduisez le poste.` });
  } else if (analyse?.recommandations?.length > 0) {
    const r = analyse.recommandations[0];
    conseils.push({ icon: r.ico || '💡', title: 'Recommandation', text: r.desc || r.description || r.titre || '' });
  } else if (budgets.length > 0) {
    const totalPrevu = budgets.reduce((s: number, b: any) => s + (b.montant_prevu || 0), 0);
    const totalUtilise = budgets.reduce((s: number, b: any) => s + (b.montant_utilise || 0), 0);
    const pctGlobal = totalPrevu > 0 ? Math.round((totalUtilise / totalPrevu) * 100) : 0;
    conseils.push({ icon: '✅', title: 'Budget', text: `Vous avez utilisé ${pctGlobal}% de votre budget global. Tout est sous contrôle.` });
  } else {
    conseils.push({ icon: '📋', title: 'Budget', text: 'Définissez des budgets par catégorie pour mieux visualiser vos dépenses.' });
  }

  return maxItems ? conseils.slice(0, maxItems) : conseils;
}

/* ── Construction des actions ── */

function buildActions(goals: any[], budgets: any[]): BriefingAction[] {
  const actions: BriefingAction[] = [
    { label: '📊 Comprendre mon analyse', type: 'navigate', action: 'analyse', route: 'analyse_financiere' },
  ];
  if (goals.length > 0) actions.push({ label: '🎯 Voir mes objectifs', type: 'navigate', route: 'objectifs_epargne' });
  if (budgets.length > 0) {
    const alert = budgets.some((b: any) => b.montant_prevu > 0 && b.montant_utilise >= b.montant_prevu * 0.8);
    if (alert) actions.unshift({ label: '⚠️ Voir mes alertes budget', type: 'navigate', route: 'budget' });
    else actions.push({ label: '💰 Optimiser mon budget', type: 'navigate', route: 'budget' });
  }
  actions.push({ label: '📅 Prévoir la fin du mois', type: 'message', text: 'Prévoir la fin du mois' });
  return actions;
}

/* ── Suggestions contextuelles (data-driven) ── */

export function generateSuggestions(
  resume: ResumeData | null,
  budgets: any[],
  goals: any[],
  conseils: Conseil[]
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const ratio = resume?.ratio_depenses ?? 0;
  const hasAlerts = budgets.some((b: any) => b.montant_prevu > 0 && b.montant_utilise >= b.montant_prevu * 0.8);

  if (ratio > 80 && !seen.has('reduire')) {
    seen.add('reduire');
    result.push('Comment réduire mes dépenses ?');
  }
  if (ratio > 0 && ratio < 50 && !seen.has('epargner')) {
    seen.add('epargner');
    result.push('Comment mieux épargner ?');
  }
  if (hasAlerts && !seen.has('alertes')) {
    seen.add('alertes');
    result.push('Voir mes alertes budget');
  }
  if (goals.length > 0 && !seen.has('objectifs')) {
    seen.add('objectifs');
    const enRetard = goals.some((g: any) => g.montant_cible > 0 && (g.montant_actuel / g.montant_cible) < 0.5);
    result.push(enRetard ? 'Comment accélérer mes objectifs ?' : 'Où en sont mes objectifs ?');
  }
  if (goals.length === 0 && !seen.has('creer')) {
    seen.add('creer');
    result.push('Créer un objectif d\'épargne');
  }
  if (!seen.has('ou_passe')) {
    seen.add('ou_passe');
    result.push('Où passe mon argent ?');
  }
  if (!seen.has('prevoir')) {
    seen.add('prevoir');
    result.push('Prévoir la fin du mois');
  }
  if (!seen.has('retablir')) {
    seen.add('retablir');
    result.push('Rétablir ma santé financière');
  }

  return result.slice(0, 3);
}

/* ── API publique ── */

/**
 * Récupère les données du briefing Motéma à partir des vraies données API.
 * En cas d'erreur (hors-ligne, non connecté…), retourne les mock data.
 */
export async function getBriefingData(userId?: string): Promise<BriefingData> {

  try {
    const [rawResume, rawBudgets, rawGoals] = await Promise.all([
      api.stats.resume().catch(() => null),
      api.budgets.list().catch(() => []),
      api.objectifs.list().catch(() => []),
    ]);

    const resume = rawResume as ResumeData | null;
    const budgets = Array.isArray(rawBudgets) ? rawBudgets : [];
    const goals = Array.isArray(rawGoals) ? rawGoals : [];

    let analyse: any = null;
    try { analyse = await api.analyseIa.derniere(); } catch { /* ignore */ }

    const conseils = buildConseils(resume, analyse, budgets, goals);

    const data: BriefingData = {
      salutationIntro: "J'ai terminé l'analyse de vos finances.",
      salutationPrompt: 'Voici ce que j\'ai retenu',
      remarques: buildRemarques(resume, budgets, goals, 3),
      conseil: conseils,
      actions: buildActions(goals, budgets),
      suggestions: [],
      guide: { text: 'Souhaitez-vous quʼon approfondisse un point en particulier ?' },
    };

    data.suggestions = generateSuggestions(resume, budgets, goals, conseils);
    return data;
  } catch (e) {
    return { ...BRIEFING, suggestions: generateSuggestions(null, [], [], BRIEFING.conseil) };
  }
}
