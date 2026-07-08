import api from '@/app/services/api';
import type { ToolResult, RevenuItem } from './types';

export async function getRevenues(): Promise<ToolResult<{ revenus: RevenuItem[]; total: number; count: number }>> {
  try {
    const raw = await api.revenus.list();
    const list = Array.isArray(raw) ? raw : [];

    const revenus: RevenuItem[] = list.map((r: any) => ({
      id: r.id,
      libelle: r.libelle || r.source || 'Revenu',
      montant: parseFloat(r.montant || 0),
      date: r.date || '',
      categorie: r.categorie_libelle || 'Revenu',
    }));

    const total = revenus.reduce((s, r) => s + r.montant, 0);

    return { success: true, data: { revenus, total, count: revenus.length } };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la récupération des revenus' };
  }
}
