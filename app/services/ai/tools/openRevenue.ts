import type { ToolResult, ActionData } from './types';

export async function openRevenue(): Promise<ToolResult<ActionData>> {
  return {
    success: true,
    data: {
      action: 'openRevenue',
      disponible: true,
      description: 'Ouvre le formulaire d\'ajout d\'un revenu',
    },
  };
}
