/* ═══════════════════════════════════════════
   score.engine.ts — Score financier global + score de constat
   ═══════════════════════════════════════════ */

import type { FinancialData, FinancialScore, FindingScore, AnalysisFinding } from '../services/motema.types';

/* ── Score financier global (0-100) ── */

export function calculateFinancialScore(data: FinancialData): FinancialScore {
  const r = data.resume;
  const ratio = r?.ratio_depenses ?? 50;
  const epargne = r?.epargne ?? 0;
  const rev = r?.revenus ?? 0;
  const tauxEpargne = rev > 0 ? (epargne / rev) * 100 : 0;
  const bAlert = data.budgets.some((b: any) => {
    const p = parseFloat(b.montant_prevu || 0);
    return p > 0 && (parseFloat(b.montant_utilise || 0) / p) >= 0.9;
  });
  const goalsOk = data.goals.filter((g: any) => {
    const c = parseFloat(g.montant_cible || 0);
    return c > 0 && (parseFloat(g.montant_actuel || 0) / c) >= 0.5;
  }).length;

  const sRev = ratio < 50 ? 100 : ratio < 70 ? 75 : ratio < 90 ? 40 : 15;
  const sDep = ratio < 50 ? 90 : ratio < 70 ? 70 : ratio < 90 ? 40 : 10;
  const sEpargne = tauxEpargne >= 20 ? 100 : tauxEpargne >= 10 ? 70 : tauxEpargne >= 5 ? 40 : 15;
  const sBudget = bAlert ? 20 : 80;
  const sObj = data.goals.length === 0 ? 30 : (goalsOk / Math.max(data.goals.length, 1)) * 100;

  const total = Math.round((sRev * 0.25 + sDep * 0.25 + sEpargne * 0.2 + sBudget * 0.15 + sObj * 0.15));

  let label: string;
  let color: string;
  if (total >= 80) { label = 'Excellent'; color = '#22D3A5'; }
  else if (total >= 60) { label = 'Bonne'; color = '#3B82F6'; }
  else if (total >= 40) { label = 'Moyenne'; color = '#F59E0B'; }
  else { label = 'Fragile'; color = '#EF4444'; }

  return {
    total,
    components: { revenus: sRev, depenses: sDep, epargne: sEpargne, budgets: sBudget, objectifs: Math.round(sObj) },
    label,
    color,
  };
}

/* ── Score individuel d'un constat ── */

export function calculateFindingScore(finding: Partial<AnalysisFinding>, data: FinancialData): FindingScore {
  const severityMap: Record<string, number> = { critical: 40, warning: 25, info: 10, success: 0 };
  const severity = severityMap[finding.severity ?? 'info'];

  const rev = data.resume?.revenus ?? 1;
  const val = finding.value ?? 0;
  const thr = finding.threshold ?? 1;
  const ratioVal = rev > 0 ? Math.min(val / rev, 1) : 0;

  const impact = Math.round(ratioVal * 30);
  const urgency = thr > 0 && val > thr ? 30 : thr > 0 && val > thr * 0.8 ? 20 : 10;
  const trend = finding.trend === 'up' && finding.type !== 'revenu' ? 10
    : finding.trend === 'down' && finding.type === 'revenu' ? 10
    : finding.trend === 'stable' ? 0
    : -5;

  const total = Math.min(100, Math.max(0, severity + urgency + impact + trend));

  return { total, severity, urgency, impact, trend };
}
