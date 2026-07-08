const path = require('path');

const prompts = {
  system:   require('./system.prompt'),
  budget:   require('./budget.prompt'),
  expenses: require('./expenses.prompt'),
  revenues: require('./revenues.prompt'),
  goals:    require('./goals.prompt'),
  analysis: require('./analysis.prompt'),
  advice:   require('./advice.prompt'),
};

/* ── Correspondance intention → prompt ── */
const INTENT_MAP = {
  budget:         'budget',
  depenses:       'expenses',
  revenus:        'revenues',
  comptes:        null,
  objectifs:      'goals',
  analyse:        'analysis',
  create_budget:  'budget',
  create_objectif:'goals',
};

/* ── API publique ── */

function getSystemPrompt() {
  return prompts.system.prompt;
}

function getPromptForIntent(intent) {
  const key = INTENT_MAP[intent];
  if (!key || !prompts[key]) return null;
  return prompts[key].prompt;
}

function getAllPrompts() {
  return Object.keys(prompts).reduce((acc, key) => {
    acc[key] = prompts[key].prompt;
    return acc;
  }, {});
}

function buildConversationPrompt(intent, contextData) {
  const system = getSystemPrompt();
  const specific = getPromptForIntent(intent);

  let conversation = system;

  if (specific) {
    conversation += '\n\n---\n\n' + specific;
  }

  if (contextData) {
    conversation += '\n\n---\n\n## DONNÉES FINANCIÈRES\n' + contextData;
  }

  return conversation;
}

module.exports = {
  getSystemPrompt,
  getPromptForIntent,
  getAllPrompts,
  buildConversationPrompt,
};
