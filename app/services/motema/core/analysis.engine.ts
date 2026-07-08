/* ═══════════════════════════════════════════
   analysis.engine.ts — Pipeline d'analyse automatique
   ═══════════════════════════════════════════ */

import api from '../../api';
import type { AnalysisFinding, FinancialData } from '../services/motema.types';
import { calculateFindingScore } from './score.engine';

/* ── Collecte unique de toutes les données ── */

export async function collectAllData(params?: { debut?: string; fin?: string }): Promise<FinancialData> {
  const [resume, budgets, goals, depenses, revenus] = await Promise.all([
    params ? api.stats.resume({ debut: params.debut, fin: params.fin }).catch(() => null) : api.stats.resume().catch(() => null),
    params ? api.budgets.list({ debut: params.debut, fin: params.fin }).catch(() => []) : api.budgets.list().catch(() => []),
    api.objectifs.list().catch(() => []),
    params ? api.depenses.list({ debut: params.debut, fin: params.fin }).catch(() => []) : api.depenses.list().catch(() => []),
    params ? api.revenus.list({ debut: params.debut, fin: params.fin }).catch(() => []) : api.revenus.list().catch(() => []),
  ]);

  const bArr = Array.isArray(budgets) ? budgets : [];
  const gArr = Array.isArray(goals) ? goals : [];
  const dArr = Array.isArray(depenses) ? depenses : [];
  const rArr = Array.isArray(revenus) ? revenus : [];

  const tri = dArr.sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());

  return {
    resume,
    budgets: bArr,
    goals: gArr,
    recentExpenses: tri.slice(0, 30),
    recentRevenues: rArr,
  };
}

/* ── Analyseurs spécialisés ── */

export function analyzeRevenus(data: FinancialData): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const r = data.resume;
  const rev = r?.revenus ?? 0;
  const ratio = r?.ratio_depenses ?? 50;

  if (rev <= 0) {
    findings.push({
      id: 'rev-001', type: 'revenu', severity: 'critical',
      label: 'Aucun revenu enregistré',
      detail: 'Vous n\'avez pas encore enregistré de revenu pour ce mois.',
      value: 0, threshold: 1, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  } else if (ratio > 90) {
    findings.push({
      id: 'rev-002', type: 'revenu', severity: 'warning',
      label: 'Revenu insuffisant',
      detail: `Vous dépensez ${ratio}% de vos revenus — il ne reste qu'une faible marge.`,
      value: rev, threshold: rev, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  } else if (ratio < 30) {
    findings.push({
      id: 'rev-003', type: 'revenu', severity: 'success',
      label: 'Bonne maîtrise des dépenses',
      detail: `Seulement ${ratio}% de vos revenus est dépensé. Vous gérez bien !`,
      value: rev, threshold: rev * 0.7, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
}

export function analyzeDepenses(data: FinancialData): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const r = data.resume;
  const dep = r?.depenses ?? 0;
  const rev = r?.revenus ?? 1;
  const ratio = rev > 0 ? (dep / rev) * 100 : 0;
  const categories = r?.top_categories ?? [];

  if (dep <= 0) {
    findings.push({
      id: 'dep-001', type: 'depense', severity: 'info',
      label: 'Aucune dépense ce mois',
      detail: 'Vous n\'avez pas encore enregistré de dépense pour ce mois.',
      value: 0, threshold: 1, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
    return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
  }

  if (ratio > 80) {
    findings.push({
      id: 'dep-002', type: 'depense', severity: 'critical',
      label: 'Dépenses trop élevées',
      detail: `Vous dépensez ${Math.round(ratio)}% de vos revenus. Il faut réduire.`,
      value: dep, threshold: rev * 0.7, trend: 'up',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  for (const cat of categories) {
    const total = cat.total ?? 0;
    if (total > 0 && rev > 0 && (total / rev) > 0.35) {
      findings.push({
        id: `dep-cat-${cat.libelle}`, type: 'depense', severity: 'warning',
        label: `${cat.libelle} pèse lourd`,
        detail: `La catégorie "${cat.libelle}" représente ${Math.round((total / rev) * 100)}% de vos revenus.`,
        category: cat.libelle, value: total, threshold: rev * 0.35, trend: 'up',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    }
  }

  return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
}

export function analyzeBudgets(data: FinancialData): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];

  for (const b of data.budgets) {
    const prevu = parseFloat(b.montant_prevu || 0);
    const utilise = parseFloat(b.montant_utilise || 0);
    if (prevu <= 0) continue;
    const pct = Math.round((utilise / prevu) * 100);
    const nom = b.categorie_libelle || 'Catégorie';

    if (pct > 100) {
      findings.push({
        id: `bud-ovr-${b.id}`, type: 'budget', severity: 'critical',
        label: `Budget ${nom} dépassé`,
        detail: `Vous avez dépassé le budget ${nom} de ${pct - 100}% (${utilise} F utilisés sur ${prevu} F prévus).`,
        category: nom, value: utilise, threshold: prevu, trend: 'up',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    } else if (pct === 100) {
      findings.push({
        id: `bud-ovr-${b.id}`, type: 'budget', severity: 'warning',
        label: `Budget ${nom} épuisé`,
        detail: `Vous avez utilisé tout le budget ${nom} (${prevu} F sur ${prevu} F).`,
        category: nom, value: utilise, threshold: prevu, trend: 'stable',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    } else if (pct >= 80) {
      findings.push({
        id: `bud-warn-${b.id}`, type: 'budget', severity: 'warning',
        label: `Budget ${nom} presque épuisé`,
        detail: `Le budget ${nom} est à ${pct}% d'utilisation. Reste : ${prevu - utilise} F.`,
        category: nom, value: utilise, threshold: prevu, trend: 'stable',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    }
  }

  if (findings.length === 0 && data.budgets.length > 0) {
    findings.push({
      id: 'bud-ok', type: 'budget', severity: 'success',
      label: 'Budgets sous contrôle',
      detail: `Tous vos budgets sont respectés. Continuez ainsi !`,
      value: 0, threshold: 0, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
}

export function analyzeObjectifs(data: FinancialData): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];

  if (data.goals.length === 0) {
    findings.push({
      id: 'obj-none', type: 'objectif', severity: 'info',
      label: 'Aucun objectif d\'épargne',
      detail: 'Vous n\'avez pas encore créé d\'objectif. C\'est le meilleur moyen d\'économiser !',
      value: 0, threshold: 1, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
    return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
  }

  for (const g of data.goals) {
    const titre = g.titre || 'Objectif';
    const actuel = parseFloat(g.montant_actuel || 0);
    const cible = parseFloat(g.montant_cible || 0);
    if (cible <= 0) continue;
    const pct = Math.round((actuel / cible) * 100);
    const restant = cible - actuel;

    if (pct >= 90) {
      findings.push({
        id: `obj-near-${g.id}`, type: 'objectif', severity: 'success',
        label: `Objectif "${titre}" presque atteint`,
        detail: `Vous êtes à ${pct}% de votre objectif ! Encore ${restant} F.`,
        category: titre, value: actuel, threshold: cible, trend: 'up',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    } else if (pct <= 10 && actuel > 0) {
      findings.push({
        id: `obj-slow-${g.id}`, type: 'objectif', severity: 'warning',
        label: `Objectif "${titre}" à ${pct}%`,
        detail: `Seulement ${pct}% atteint. Essayez d'économiser au moins ${Math.round(restant / 6)} F par mois.`,
        category: titre, value: actuel, threshold: cible, trend: 'stable',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    } else if (pct < 50) {
      findings.push({
        id: `obj-pct-${g.id}`, type: 'objectif', severity: 'info',
        label: `Objectif "${titre}" à ${pct}%`,
        detail: `Vous avez atteint ${pct}% de votre cible. Il reste ${restant} F à économiser.`,
        category: titre, value: actuel, threshold: cible, trend: 'stable',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    } else {
      findings.push({
        id: `obj-ok-${g.id}`, type: 'objectif', severity: 'success',
        label: `Objectif "${titre}" : bonne progression`,
        detail: `Vous êtes à ${pct}% de votre cible. Continuez sur cette lancée !`,
        category: titre, value: actuel, threshold: cible, trend: 'up',
        score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
        priorityScore: 0,
      });
    }
  }

  return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
}

export function analyzeHabits(data: FinancialData): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const expenses = data.recentExpenses;

  if (expenses.length < 3) return findings;

  const dates = expenses.map((e: any) => new Date(e.date || e.created_at)).filter(Boolean);
  if (dates.length < 2) return findings;

  dates.sort((a: any, b: any) => b.getTime() - a.getTime());
  const lastDate = dates[0];
  const daysSince = Math.round((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince >= 5) {
    findings.push({
      id: 'hab-inact', type: 'habitude', severity: 'info',
      label: 'Aucune dépense depuis plusieurs jours',
      detail: `Vous n'avez pas enregistré de dépense depuis ${daysSince} jours.`,
      value: daysSince, threshold: 5, trend: 'up',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
}

export function analyzeRisks(data: FinancialData): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const r = data.resume;
  const dep = r?.depenses ?? 0;
  const rev = r?.revenus ?? 1;
  const ratio = rev > 0 ? (dep / rev) * 100 : 0;
  const epargne = r?.epargne ?? 0;
  const tauxEpargne = rev > 0 ? (epargne / rev) * 100 : 0;

  if (ratio > 100) {
    findings.push({
      id: 'risk-neg', type: 'risque', severity: 'critical',
      label: 'Dépenses supérieures aux revenus',
      detail: `Vous dépensez ${Math.round(ratio)}% de vos revenus. Risque de découvert.`,
      value: dep, threshold: rev, trend: 'up',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  if (ratio > 80 && ratio <= 100) {
    findings.push({
      id: 'risk-high', type: 'risque', severity: 'warning',
      label: 'Marge financière très fine',
      detail: `Vous utilisez ${Math.round(ratio)}% de vos revenus. Il ne reste quasiment plus de marge.`,
      value: dep, threshold: rev * 0.8, trend: 'up',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  if (tauxEpargne < 5 && rev > 0) {
    findings.push({
      id: 'risk-epargne', type: 'risque', severity: 'info',
      label: 'Épargne faible',
      detail: `Vous épargnez moins de 5% de vos revenus. Essayez de mettre au moins 10% de côté.`,
      value: epargne, threshold: rev * 0.1, trend: 'stable',
      score: { total: 0, severity: 0, urgency: 0, impact: 0, trend: 0 },
      priorityScore: 0,
    });
  }

  return findings.map(f => { f.score = calculateFindingScore(f, data); f.priorityScore = f.score.total; return f; });
}

/* ── Pipeline complet ── */

export async function runFullAnalysis(params?: { debut?: string; fin?: string }): Promise<{ findings: AnalysisFinding[]; data: FinancialData }> {
  const data = await collectAllData(params);

  const allFindings = [
    ...analyzeRevenus(data),
    ...analyzeDepenses(data),
    ...analyzeBudgets(data),
    ...analyzeObjectifs(data),
    ...analyzeHabits(data),
    ...analyzeRisks(data),
  ];

  return { findings: allFindings, data };
}
