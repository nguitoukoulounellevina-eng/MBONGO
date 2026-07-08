import type { ToolResult, ActionData } from './types';

export async function openCreateBudget(): Promise<ToolResult<ActionData>> {
  return {
    success: true,
    data: {
      action: 'openCreateBudget',
      disponible: true,
      description: 'Ouvre le formulaire de création d\'un budget',
    },
  };
}
