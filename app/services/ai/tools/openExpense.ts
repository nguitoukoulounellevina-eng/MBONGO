import type { ToolResult, ActionData } from './types';

export async function openExpense(): Promise<ToolResult<ActionData>> {
  return {
    success: true,
    data: {
      action: 'openExpense',
      disponible: true,
      description: 'Ouvre le formulaire d\'ajout d\'une dépense',
    },
  };
}
