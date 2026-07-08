import type { ToolResult, ActionData } from './types';

export async function openCreateGoal(): Promise<ToolResult<ActionData>> {
  return {
    success: true,
    data: {
      action: 'openCreateGoal',
      disponible: true,
      description: 'Ouvre le formulaire de création d\'un objectif d\'épargne',
    },
  };
}
