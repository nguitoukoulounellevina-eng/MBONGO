import { executeTool } from './tools/index';
import { analyzeIntent } from '@/app/services/intent.service';

/* ═══════════════════════════════════════════
   normalize — reprend la même logique
   que intent.service pour détection large
   ═══════════════════════════════════════════ */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?,.!;:(){}[\]"'«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

/* ═══════════════════════════════════════════
   buildContext
   Construit un résumé financier ciblé à
   partir de la question de l'utilisateur
   ═══════════════════════════════════════════ */
export async function buildContext(userMessage: string): Promise<string> {
  const { intent } = analyzeIntent(userMessage);
  const normalized = normalize(userMessage);
  const now = new Date();
  const parts: string[] = [];

  /* ── 0. Détection de la période demandée ── */
  const isDay = normalized.includes('jour') || normalized.includes('hier') || normalized.includes('aujourd');
  const isWeek = normalized.includes('semaine');
  const isMonth = normalized.includes('mois');
  const periodLabel = isDay ? 'aujourd\'hui' : isWeek ? 'cette semaine' : 'ce mois';

  /* ── 1. Résumé financier global ── */
  try {
    const stats = await executeTool('getStatistics');
    if (stats.success && stats.data) {
      const d = stats.data as any;
      parts.push(`[RÉSUMÉ FINANCIER — ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}]`);
      parts.push(`Revenus : ${fmt(d.revenus || 0)}`);
      parts.push(`Dépenses : ${fmt(d.depenses || 0)}`);
      parts.push(`Budget utilisé : ${fmt(d.budgetUtilise || 0)}`);
      parts.push(`Épargne constituée : ${fmt(d.epargne || 0)}`);
      if (d.ratioDepenses !== undefined) {
        parts.push(`Taux d'endettement : ${d.ratioDepenses} % des revenus.`);
      }
    }
  } catch { /* silencieux */ }

  /* ── 2. Comptes (toujours utiles) ── */
  try {
    const accounts = await executeTool('getAccounts');
    if (accounts.success && Array.isArray(accounts.data)) {
      const list = accounts.data as any[];
      if (list.length > 0) {
        parts.push(`\n[COMPTES BANCAIRES (${list.length})]`);
        for (const c of list) {
          parts.push(`- ${c.nom || 'Compte'} : ${fmt(c.solde || 0)} (${c.type || '-'})`);
        }
      }
    }
  } catch { /* silencieux */ }

  /* ── 3. Budgets ── */
  if (normalized.includes('budget') || intent === 'budget' || intent === 'analyse') {
    try {
      const budget = await executeTool('getBudget');
      const budData = (budget.data as any)?.budgets;
      if (budget.success && Array.isArray(budData) && budData.length > 0) {
        const list = budData as any[];
        parts.push(`\n[BUDGETS DU MOIS (${list.length})]`);
        let totalPrevu = 0;
        let totalUtilise = 0;
        for (const b of list) {
          totalPrevu += b.prevu || 0;
          totalUtilise += b.utilise || 0;
          const reste = (b.prevu || 0) - (b.utilise || 0);
          const etat = reste >= 0 ? `reste ${fmt(reste)}` : `dépassé de ${fmt(Math.abs(reste))}`;
          parts.push(`- ${b.icone || '📊'} ${b.categorie || 'Budget'} : ${fmt(b.utilise || 0)} / ${fmt(b.prevu || 0)} (${etat})`);
        }
        parts.push(`Total : ${fmt(totalUtilise)} / ${fmt(totalPrevu)}`);
      }
    } catch { /* silencieux */ }
  }

  /* ── 4. Dépenses ── */
  if (
    normalized.includes('depense') || normalized.includes('dépense') ||
    normalized.includes('argent') || normalized.includes('depensé') ||
    normalized.includes('dépensé') || normalized.includes('cout') ||
    normalized.includes('coût') || normalized.includes('cher') ||
    intent === 'depenses' || intent === 'analyse'
  ) {
    try {
      const expenses = await executeTool('getExpenses');
      const expData = (expenses.data as any)?.depenses;
      if (expenses.success && Array.isArray(expData) && expData.length > 0) {
        const list = expData as any[];
        const total = list.reduce((s: number, d: any) => s + (d.montant || 0), 0);
        parts.push(`\n[DÉPENSES RÉCENTES (${list.length} au total — ${fmt(total)})]`);
        for (const d of list.slice(0, 8)) {
          parts.push(`- ${d.icone || '💸'} ${d.libelle || 'Dépense'} : ${fmt(d.montant || 0)} (${d.categorie || '-'}) — ${d.date || ''}`);
        }
      }
    } catch { /* silencieux */ }
  }

  /* ── 5. Revenus ── */
  if (normalized.includes('revenu') || normalized.includes('salaire') || normalized.includes('gagne') || intent === 'revenus' || intent === 'analyse') {
    try {
      const revenus = await executeTool('getRevenues');
      const revData = (revenus.data as any)?.revenus;
      if (revenus.success && Array.isArray(revData) && revData.length > 0) {
        const list = revData as any[];
        const total = list.reduce((s: number, r: any) => s + (r.montant || 0), 0);
        parts.push(`\n[REVENUS (${list.length} source(s) — ${fmt(total)})]`);
        for (const r of list.slice(0, 5)) {
          parts.push(`- ${r.libelle || r.source || 'Revenu'} : ${fmt(r.montant || 0)}${r.date ? ` (${r.date})` : ''}`);
        }
      }
    } catch { /* silencieux */ }
  }

  /* ── 6. Objectifs ── */
  if (
    normalized.includes('objectif') || normalized.includes('epargne') ||
    normalized.includes('épargne') || normalized.includes('projet') ||
    intent === 'objectifs' || intent === 'analyse'
  ) {
    try {
      const goals = await executeTool('getGoals');
      if (goals.success && Array.isArray(goals.data) && goals.data.length > 0) {
        const list = goals.data as any[];
        parts.push(`\n[OBJECTIFS D'ÉPARGNE (${list.length})]`);
        for (const o of list) {
          const pct = o.progression || 0;
          const reste = (o.cible || 0) - (o.actuel || 0);
          parts.push(`- ${o.icone || '🎯'} ${o.titre || 'Objectif'} : ${fmt(o.actuel || 0)} / ${fmt(o.cible || 0)} (${pct} %) — reste ${fmt(Math.max(0, reste))}`);
        }
      }
    } catch { /* silencieux */ }
  }

  /* ── 7. Indication de période ── */
  const prevLabel = isDay ? 'hier' : isWeek ? 'la semaine dernière' : 'le mois dernier';
  parts.push(`\n[PÉRIODE] L'utilisateur consulte les données de ${periodLabel}.`);
  parts.push(`[COMPARAISON] Compare toujours les données avec ${prevLabel} — jamais avec la période en cours.`);

  if (parts.length === 0) {
    return 'Aucune information financière disponible pour le moment.';
  }

  return parts.join('\n');
}
