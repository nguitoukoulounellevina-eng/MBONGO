/* ═══════════════════════════════════════════
   motema.service.ts — Orchestrateur public du moteur Motéma
   ═══════════════════════════════════════════ */

import { runFullAnalysis } from '../core/analysis.engine';
import { calculateFinancialScore } from '../core/score.engine';
import { scoreFindings, getTopPriorities, hasCriticalAlerts } from '../core/priority.engine';
import { generateSuggestions } from '../../motema.service';
import type { AnalysisFinding, FinancialData, FinancialScore, AnalysisContext, MotemaBriefing } from './motema.types';

/* ── Génère le briefing intelligent Motéma ── */

function fmt(v: number): string {
  return `${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} FCFA`;
}

function resumeLine(rev: number, dep: number, periodeType?: string): string {
  if (rev <= 0 && dep <= 0) return '';
  const solde = rev - dep;
  const soldeEmoji = solde >= 0 ? '💰' : '⚠️';
  const label =
    periodeType === 'quotidien' ? 'du jour' :
    periodeType === 'hebdomadaire' ? 'de la semaine' :
    'du mois';
  return `\n\n📊 Résumé ${label} : Revenus ${fmt(rev)} · Dépenses ${fmt(dep)} · ${soldeEmoji} Solde ${fmt(Math.abs(solde))}${solde >= 0 ? ' (d\'avance)' : ' (en moins)'}`;
}

let _periodeTypeForTemplates = 'mensuel';

const SALUTATION_TEMPLATES: ((prenom: string, daysSinceLast?: number, visitCount?: number, rev?: number, dep?: number) => string)[] = [
  (p, d, v, rev, dep) => `${p} 👋\n\nRavi de vous revoir ! J'ai regardé vos dernières finances.${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)} ${d && d >= 7 ? '\n\nIl s\'est passé pas mal de nouveautés.' : ''}`,
  (p, d, v, rev, dep) => `${p} 👋\n\nContent de vous retrouver ! Je viens de passer en revue votre situation.${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)} ${d && d >= 7 ? '\n\nPlein de choses ont changé !' : ''}`,
  (p, d, v, rev, dep) => `${p} 👋\n\nDe retour ! J'ai mis à jour mon analyse.${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)} ${d && d >= 7 ? '\n\nBeaucoup de choses ont changé dans vos finances.' : ''}`,
  (p, d, v, rev, dep) => `${p} 👋\n\nHeureux de vous voir ! Petit tour de vos finances du moment.${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)}`,
];

const NEW_USER_TEMPLATES: ((prenom: string, rev?: number, dep?: number) => string)[] = [
  (p, rev, dep) => `Bonjour ${p} ! 👋\n\nJe suis Motéma, votre assistant financier. Bienvenue sur MBONGO ! Pour l'instant, votre espace est vierge, mais c'est normal. Commencez par ajouter vos premières transactions depuis la page d'accueil, et je pourrai analyser vos finances. Que souhaitez-vous faire ?`,
  (p, rev, dep) => `Bonjour ${p} ! 👋\n\nBienvenue dans MBONGO ! Je suis Motéma, ravi de vous accompagner. Une fois vos premières dépenses et revenus ajoutés, je vous donnerai des conseils personnalisés. En attendant, explorons ensemble l'application !`,
  (p, rev, dep) => `Bonjour ${p} ! 👋\n\nHeureux de vous compter parmi les utilisateurs de MBONGO ! Je suis Motéma. Commencez par renseigner vos transactions, créer des objectifs d'épargne ou définir un budget. Je serai là pour vous guider à chaque étape.`,
];

const NO_VISIT_TEMPLATES: ((prenom: string, rev?: number, dep?: number) => string)[] = [
  (p, rev, dep) => `Bonjour ${p} 👋\n\nJ'ai regardé votre situation financière.${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)}\n\nVoici ce qui mérite votre attention :`,
  (p, rev, dep) => `Bonjour ${p} 👋\n\nJe viens de regarder vos finances en détail.${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)}\n\nVoici un aperçu de votre situation :`,
  (p, rev, dep) => `Bonjour ${p} 👋\n\nPetit point sur vos finances !${resumeLine(rev ?? 0, dep ?? 0, _periodeTypeForTemplates)}\n\nVoici ce que je retiens de votre situation :`,
];

function pickTemplate<T>(templates: T[], seed: number): T {
  return templates[seed % templates.length];
}

function computeDaysSinceLastVisit(lastVisit: string | null): number | undefined {
  if (!lastVisit) return undefined;
  const diff = Date.now() - new Date(lastVisit).getTime();
  return Math.floor(diff / 86400000);
}

export async function getMotemaBriefing(context: AnalysisContext): Promise<MotemaBriefing> {
  _periodeTypeForTemplates = context.periodeType || 'mensuel';
  const periodParams = context.debut && context.fin ? { debut: context.debut, fin: context.fin } : undefined;
  const { findings, data } = await runFullAnalysis(periodParams);

  const scored = scoreFindings(findings);
  const score = calculateFinancialScore(data);

  const daysSinceLast = computeDaysSinceLastVisit(context.lastVisit ?? null);
  const visitCount = context.visitCount ?? 0;
  const priorities = getTopPriorities(scored, context.lastPriorityIds ? undefined : 3, context.lastPriorityIds);

  const suggestions = generateSuggestions(
    data.resume as any,
    data.budgets,
    data.goals,
    [],
  );

  const prenom = context.userName || 'Utilisateur';
  const now = new Date();
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const rev = data.resume?.revenus ?? 0;
  const dep = data.resume?.depenses ?? 0;

  let salutation: string;
  const hasEmoji = true;
  const tone = 'encouraging';
  const vocab = 'balanced';

  if (context.isNewUser) {
    let tpl = pickTemplate(NEW_USER_TEMPLATES, visitCount)(prenom, rev, dep);
    if (!hasEmoji) tpl = tpl.replace(/[\u{1F600}-\u{1F9FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{24C2}-\u{1F251}]|[\u25A0-\u27BF}]/gu, '').replace(/\s+/g, ' ').trim();
    if (vocab === 'simple') tpl = tpl.replace(/passer en revue/g, 'regarder').replace(/étudié/g, 'regardé');
    if (tone === 'formal') salutation = `Bonjour ${prenom}, Motéma vous souhaite la bienvenue.${resumeLine(rev, dep)}\n\nJ'ai regardé votre situation financière :`;
    else salutation = tpl;
  } else if (context.lastVisit) {
    const seed = visitCount + (daysSinceLast ?? 0);
    const tpl = pickTemplate(SALUTATION_TEMPLATES, seed);
    let msg = `${timeGreeting} ${tpl(prenom, daysSinceLast, visitCount, rev, dep)}`;
    if (!hasEmoji) msg = msg.replace(/[\u{1F600}-\u{1F9FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{24C2}-\u{1F251}]|[\u25A0-\u27BF}]/gu, '').replace(/\s+/g, ' ').trim();
    if (vocab === 'simple') msg = msg.replace(/passer en revue/g, 'regarder');
    if (tone === 'formal') msg = msg.replace(/Content de vous retrouver/g, 'Heureux de vous retrouver');
    salutation = msg;
  } else {
    let tpl = pickTemplate(NO_VISIT_TEMPLATES, visitCount)(prenom, rev, dep);
    if (!hasEmoji) tpl = tpl.replace(/[\u{1F600}-\u{1F9FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2702}-\u{27B0}]|[\u{24C2}-\u{1F251}]|[\u25A0-\u27BF}]/gu, '').replace(/\s+/g, ' ').trim();
    if (tone === 'formal') tpl = `Bonjour ${prenom}, voici un point sur vos finances du moment :${resumeLine(rev, dep)}`;
    salutation = tpl;
  }

  return {
    score,
    topPriorities: priorities,
    allFindings: scored,
    suggestions,
    salutation,
    hasAlerts: hasCriticalAlerts(scored),
    revenus: rev,
    depenses: dep,
    goals: data.goals.map(g => ({
      id: g.id,
      titre: g.titre,
      montant_actuel: parseFloat(g.montant_actuel || 0),
      montant_cible: parseFloat(g.montant_cible || 0),
    })),
  };
}
