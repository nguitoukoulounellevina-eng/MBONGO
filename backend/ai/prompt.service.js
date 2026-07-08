const prompts = require('../services/ai/prompts/index');

exports.getSystemPrompt = () => {
  return prompts.getSystemPrompt();
};

exports.getPromptForIntent = (intent) => {
  return prompts.getPromptForIntent(intent);
};

exports.buildContextPrompt = async (utilisateurId, message) => {
  return '[Contexte financier à implémenter]';
};

exports.buildConversationPrompt = (intent, contextData) => {
  return prompts.buildConversationPrompt(intent, contextData);
};
