import type { ToolResult, ActionData } from './types';

export async function openBudgetEdition(): Promise<ToolResult<ActionData>> {
  return {
    success: true,
    data: {
      action: 'openBudgetEdition',
      disponible: true,
      description: 'Ouvre le formulaire d\'édition d\'un budget existant',
    },
  };
}
