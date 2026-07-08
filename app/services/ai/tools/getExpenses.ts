import api from '@/app/services/api';
import type { ToolResult, DepenseItem } from './types';

export async function getExpenses(): Promise<ToolResult<{ depenses: DepenseItem[]; total: number; count: number }>> {
  try {
    const raw = await api.depenses.list();
    const list = Array.isArray(raw) ? raw : [];

    const depenses: DepenseItem[] = list.map((d: any) => ({
      id: d.id,
      libelle: d.libelle || d.description || 'Dépense',
      montant: parseFloat(d.montant || 0),
      categorie: d.categorie_libelle || 'Non catégorisé',
      icone: d.categorie_icone || '\u{1F4B5}',
      date: d.date_depense || d.date || '',
      compte: d.compte_id ? (d.nom_compte || 'Compte') : null,
    }));

    const total = depenses.reduce((s, d) => s + d.montant, 0);

    return { success: true, data: { depenses, total, count: depenses.length } };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la récupération des dépenses' };
  }
}
