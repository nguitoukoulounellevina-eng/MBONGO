import api from '@/app/services/api';
import type { ToolResult, StatsData } from './types';

export async function getStatistics(): Promise<ToolResult<StatsData>> {
  try {
    const [resume, objectifs, comptes] = await Promise.all([
      api.stats.resume().catch(() => null),
      api.objectifs.list().catch(() => []),
      api.comptes.list().catch(() => []),
    ]);

    const oList = Array.isArray(objectifs) ? objectifs : [];
    const cList = Array.isArray(comptes) ? comptes : [];

    const totalCible = oList.reduce((s: number, o: any) => s + parseFloat(o.montant_cible || 0), 0);
    const totalActuel = oList.reduce((s: number, o: any) => s + parseFloat(o.montant_actuel || 0), 0);

    const data: StatsData = {
      revenus: resume?.revenus || 0,
      depenses: resume?.depenses || 0,
      budgetUtilise: resume?.budget?.utilise || 0,
      epargne: totalActuel,
      ratioDepenses: (resume?.revenus || 0) > 0
        ? Math.round(((resume?.depenses || 0) / (resume?.revenus || 0)) * 100)
        : 0,
      countObjectifs: oList.length,
      countComptes: cList.length,
    };

    return { success: true, data };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la récupération des statistiques' };
  }
}
