import api from '@/app/services/api';
import type { ToolResult, ObjectifItem } from './types';

export async function getGoals(): Promise<ToolResult<{ objectifs: ObjectifItem[]; totalCible: number; totalEpargne: number; progressionGlobale: number }>> {
  try {
    const raw = await api.objectifs.list();
    const list = Array.isArray(raw) ? raw : [];

    const objectifs: ObjectifItem[] = list.map((o: any) => {
      const cible = parseFloat(o.montant_cible || 0);
      const actuel = parseFloat(o.montant_actuel || 0);
      const progression = cible > 0 ? Math.round((actuel / cible) * 100) : 0;
      return {
        id: o.id,
        icone: o.icone || '\u{1F3AF}',
        titre: o.titre || 'Objectif',
        cible,
        actuel,
        restant: Math.max(0, cible - actuel),
        progression,
        statut: progression >= 100 ? 'atteint' : (o.statut || 'en_cours'),
      };
    });

    const totalCible = objectifs.reduce((s, o) => s + o.cible, 0);
    const totalEpargne = objectifs.reduce((s, o) => s + o.actuel, 0);
    const progressionGlobale = totalCible > 0 ? Math.round((totalEpargne / totalCible) * 100) : 0;

    return { success: true, data: { objectifs, totalCible, totalEpargne, progressionGlobale } };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la récupération des objectifs' };
  }
}
