import type { ToolResult, ActionData } from './types';

export async function openGoalFunding(): Promise<ToolResult<ActionData>> {
  return {
    success: true,
    data: {
      action: 'openGoalFunding',
      disponible: true,
      description: 'Ouvre le formulaire d\'alimentation d\'un objectif',
    },
  };
}
