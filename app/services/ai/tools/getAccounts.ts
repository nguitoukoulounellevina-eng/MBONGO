import api from '@/app/services/api';
import type { ToolResult, CompteItem } from './types';

export async function getAccounts(): Promise<ToolResult<{ comptes: CompteItem[]; total: number; count: number }>> {
  try {
    const raw = await api.comptes.list();
    const list = Array.isArray(raw) ? raw : [];

    const comptes: CompteItem[] = list.map((c: any) => ({
      id: c.id,
      nom: c.nom_compte || 'Compte',
      solde: parseFloat(c.solde_actuel || 0),
      type: c.type_compte || 'Compte',
      devise: c.devise || 'FCFA',
    }));

    const total = comptes.reduce((s, c) => s + c.solde, 0);

    return { success: true, data: { comptes, total, count: comptes.length } };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la récupération des comptes' };
  }
}
