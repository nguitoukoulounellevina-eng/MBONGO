/* ═══════════════════════════════════════════
   motema.types.ts — Types partagés du moteur Motéma
   ═══════════════════════════════════════════ */

export type Severity = 'critical' | 'warning' | 'info' | 'success';

export type FindingType = 'revenu' | 'depense' | 'objectif' | 'budget' | 'habitude' | 'risque' | 'insight';

export type Trend = 'up' | 'down' | 'stable';

export interface FindingScore {
  total: number;
  severity: number;
  urgency: number;
  impact: number;
  trend: number;
}

export interface AnalysisFinding {
  id: string;
  type: FindingType;
  severity: Severity;
  label: string;
  detail: string;
  category?: string;
  value?: number;
  threshold?: number;
  trend?: Trend;
  score: FindingScore;
  priorityScore: number;
}

export interface FinancialScore {
  total: number;
  components: {
    revenus: number;
    depenses: number;
    epargne: number;
    budgets: number;
    objectifs: number;
  };
  label: string;
  color: string;
}

export interface FinancialData {
  resume: {
    revenus?: number;
    depenses?: number;
    epargne?: number;
    ratio_depenses?: number;
    budget?: { utilise?: number; prevu?: number; restant?: number };
    comptes?: { total?: number; solde_total?: number };
    objectifs?: { total?: number; epargne?: number; cible?: number };
    top_categories?: { libelle: string; icone: string; couleur: string; total: number }[];
  } | null;
  budgets: any[];
  goals: any[];
  recentExpenses: any[];
  recentRevenues: any[];
}

export interface AnalysisResult {
  findings: AnalysisFinding[];
  score: FinancialScore;
  topPriorities: AnalysisFinding[];
}

export interface AnalysisContext {
  userId?: string;
  userName?: string;
  lastVisit?: string | null;
  lastTopic?: string | null;
  isNewUser?: boolean;
  lastPriorityIds?: string[];
  visitCount?: number;
  debut?: string;
  fin?: string;
  periodeType?: string;
}

export interface MotemaBriefing {
  score: FinancialScore;
  topPriorities: AnalysisFinding[];
  allFindings: AnalysisFinding[];
  suggestions: string[];
  salutation: string;
  hasAlerts: boolean;
  revenus: number;
  depenses: number;
  goals: { id: number; titre: string; montant_actuel: number; montant_cible: number }[];
}
