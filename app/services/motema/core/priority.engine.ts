/* ═══════════════════════════════════════════
   priority.engine.ts — Score de priorité + classement
   ═══════════════════════════════════════════ */

import type { AnalysisFinding } from '../services/motema.types';

/* ── Recalcule le score final en combinant score + poids métier ── */

export function computeFinalPriority(finding: AnalysisFinding, context?: { recentTopics?: string[] }): number {
  let score = finding.score.total;

  // Bonus de sévérité : les findings critical sont amplifiés
  if (finding.severity === 'critical') score = Math.min(100, score + 10);
  if (finding.severity === 'warning') score = Math.min(100, score + 5);

  // Malus pour les findings succès (pas prioritaires)
  if (finding.severity === 'success') score = Math.max(0, score - 20);

  // Bonus si le type est "risque" (toujours prioritaire)
  if (finding.type === 'risque') score = Math.min(100, score + 8);

  // Bonus si la tendance est à la hausse pour un problème
  if (finding.trend === 'up' && finding.severity !== 'success') score = Math.min(100, score + 5);

  // Context bonus : si l'utilisateur a récemment parlé de ce sujet
  if (context?.recentTopics?.some(t => finding.category?.toLowerCase().includes(t.toLowerCase()) || finding.label.toLowerCase().includes(t.toLowerCase()))) {
    score = Math.min(100, score + 3);
  }

  return score;
}

/* ── Classe les findings par priorité ── */

export function scoreFindings(findings: AnalysisFinding[], context?: { recentTopics?: string[] }): AnalysisFinding[] {
  return findings.map(f => ({
    ...f,
    priorityScore: computeFinalPriority(f, context),
  })).sort((a, b) => b.priorityScore - a.priorityScore);
}

/* ── Garde uniquement les N premiers, optionnellement en excluant des IDs ── */

export function getTopPriorities(
  findings: AnalysisFinding[],
  n: number = 3,
  excludeIds?: string[],
): AnalysisFinding[] {
  const scored = scoreFindings(findings);
  if (!excludeIds || excludeIds.length === 0) return scored.slice(0, n);

  const excluded = new Set(excludeIds);
  const filtered = scored.filter(f => !excluded.has(f.id));

  // Si on n'a plus assez de résultats après filtre, on prend les meilleurs
  // en ne gardant que les vrais exclusions — on complète avec les meilleurs
  // globaux (évite d'afficher moins de N items)
  if (filtered.length >= n) return filtered.slice(0, n);

  const needed = n - filtered.length;
  const fallback = scored.filter(f => excluded.has(f.id)).slice(0, needed);
  return [...filtered, ...fallback];
}

/* ── Vérifie s'il y a des alertes critiques ── */

export function hasCriticalAlerts(findings: AnalysisFinding[]): boolean {
  return findings.some(f => f.severity === 'critical' && f.priorityScore > 0);
}

/* ── Résumé textuel des priorités ── */

export function summarizePriorities(findings: AnalysisFinding[]): string {
  const top = getTopPriorities(findings, 3);
  if (top.length === 0) return 'Tout va bien pour le moment.';

  return top.map((f, i) => {
    const icons: Record<string, string> = { critical: '🔴', warning: '🟠', info: '🔵', success: '🟢' };
    return `${icons[f.severity] ?? '⚪'} **${f.label}**\n   ${f.detail}`;
  }).join('\n\n');
}
