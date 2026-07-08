import { getAccounts } from './getAccounts';
import { getRevenues } from './getRevenues';
import { getExpenses } from './getExpenses';
import { getBudget } from './getBudget';
import { getGoals } from './getGoals';
import { getStatistics } from './getStatistics';
import { openCreateBudget } from './openCreateBudget';
import { openCreateGoal } from './openCreateGoal';
import { openGoalFunding } from './openGoalFunding';
import { openBudgetEdition } from './openBudgetEdition';
import { openExpense } from './openExpense';
import { openRevenue } from './openRevenue';
import type { ToolResult } from './types';

/* ── Registre des outils ── */

export interface ToolMetadata {
  name: string;
  description: string;
  category: 'lecture' | 'action';
  parameters: { name: string; type: string; required: boolean; description: string }[];
}

type ToolFn = (...args: any[]) => Promise<ToolResult>;

interface ToolEntry {
  metadata: ToolMetadata;
  fn: ToolFn;
}

const registry: Record<string, ToolEntry> = {
  getAccounts: {
    metadata: {
      name: 'getAccounts',
      description: 'Récupère la liste des comptes bancaires avec soldes et types',
      category: 'lecture',
      parameters: [],
    },
    fn: getAccounts as ToolFn,
  },
  getRevenues: {
    metadata: {
      name: 'getRevenues',
      description: 'Récupère la liste des revenus avec montants et dates',
      category: 'lecture',
      parameters: [],
    },
    fn: getRevenues as ToolFn,
  },
  getExpenses: {
    metadata: {
      name: 'getExpenses',
      description: 'Récupère la liste des dépenses avec catégories, dates et montants',
      category: 'lecture',
      parameters: [],
    },
    fn: getExpenses as ToolFn,
  },
  getBudget: {
    metadata: {
      name: 'getBudget',
      description: 'Récupère les budgets du mois avec prévisions, utilisation et reste',
      category: 'lecture',
      parameters: [],
    },
    fn: getBudget as ToolFn,
  },
  getGoals: {
    metadata: {
      name: 'getGoals',
      description: 'Récupère les objectifs d\'épargne avec progression et montants',
      category: 'lecture',
      parameters: [],
    },
    fn: getGoals as ToolFn,
  },
  getStatistics: {
    metadata: {
      name: 'getStatistics',
      description: 'Récupère un résumé statistique global (revenus, dépenses, épargne, budget)',
      category: 'lecture',
      parameters: [],
    },
    fn: getStatistics as ToolFn,
  },
  openCreateBudget: {
    metadata: {
      name: 'openCreateBudget',
      description: 'Ouvre le formulaire de création d\'un budget',
      category: 'action',
      parameters: [],
    },
    fn: openCreateBudget as ToolFn,
  },
  openCreateGoal: {
    metadata: {
      name: 'openCreateGoal',
      description: 'Ouvre le formulaire de création d\'un objectif d\'épargne',
      category: 'action',
      parameters: [],
    },
    fn: openCreateGoal as ToolFn,
  },
  openGoalFunding: {
    metadata: {
      name: 'openGoalFunding',
      description: 'Ouvre le formulaire d\'alimentation d\'un objectif',
      category: 'action',
      parameters: [
        { name: 'objectifId', type: 'number', required: false, description: 'Identifiant de l\'objectif à alimenter' },
      ],
    },
    fn: openGoalFunding as ToolFn,
  },
  openBudgetEdition: {
    metadata: {
      name: 'openBudgetEdition',
      description: 'Ouvre le formulaire d\'édition d\'un budget existant',
      category: 'action',
      parameters: [
        { name: 'budgetId', type: 'number', required: false, description: 'Identifiant du budget à modifier' },
      ],
    },
    fn: openBudgetEdition as ToolFn,
  },
  openExpense: {
    metadata: {
      name: 'openExpense',
      description: 'Ouvre le formulaire d\'ajout d\'une dépense',
      category: 'action',
      parameters: [],
    },
    fn: openExpense as ToolFn,
  },
  openRevenue: {
    metadata: {
      name: 'openRevenue',
      description: 'Ouvre le formulaire d\'ajout d\'un revenu',
      category: 'action',
      parameters: [],
    },
    fn: openRevenue as ToolFn,
  },
};

/* ── API publique ── */

export function getAvailableTools(): ToolMetadata[] {
  return Object.values(registry).map(entry => entry.metadata);
}

export async function executeTool(name: string, ...args: any[]): Promise<ToolResult> {
  const entry = registry[name];
  if (!entry) {
    return { success: false, message: `Outil "${name}" inconnu` };
  }
  try {
    return await entry.fn(...args);
  } catch (e: any) {
    return { success: false, message: e?.message || `Erreur lors de l'exécution de "${name}"` };
  }
}

export function getTool(name: string): ToolFn | null {
  return registry[name]?.fn || null;
}

/* ── Re-exports individuels ── */
export { getAccounts } from './getAccounts';
export { getRevenues } from './getRevenues';
export { getExpenses } from './getExpenses';
export { getBudget } from './getBudget';
export { getGoals } from './getGoals';
export { getStatistics } from './getStatistics';
export { openCreateBudget } from './openCreateBudget';
export { openCreateGoal } from './openCreateGoal';
export { openGoalFunding } from './openGoalFunding';
export { openBudgetEdition } from './openBudgetEdition';
export { openExpense } from './openExpense';
export { openRevenue } from './openRevenue';

export type { ToolResult, ToolMetadata } from './types';
