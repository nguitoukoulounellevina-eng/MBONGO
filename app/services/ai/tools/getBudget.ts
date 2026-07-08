import api from '@/app/services/api';
import type { ToolResult, BudgetItem } from './types';

export async function getBudget(): Promise<ToolResult<{ budgets: BudgetItem[]; actifs: number; totalPrevu: number; totalUtilise: number }>> {
  try {
    const raw = await api.budgets.list();
    const list = Array.isArray(raw) ? raw : [];

    const budgets: BudgetItem[] = list.map((b: any) => {
      const prevu = parseFloat(b.montant_prevu || 0);
      const utilise = parseFloat(b.montant_utilise || 0);
      return {
        id: b.id,
        categorie: b.categorie_libelle || 'Budget',
        icone: b.categorie_icone || '\u{1F4B0}',
        prevu,
        utilise,
        restant: prevu - utilise,
        depasse: utilise > prevu,
      };
    });

    const totalPrevu = budgets.reduce((s, b) => s + b.prevu, 0);
    const totalUtilise = budgets.reduce((s, b) => s + b.utilise, 0);

    return { success: true, data: { budgets, actifs: budgets.length, totalPrevu, totalUtilise } };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la récupération des budgets' };
  }
}
