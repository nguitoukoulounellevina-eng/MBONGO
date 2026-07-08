const getAccounts = require('./getAccounts');
const getBudgets = require('./getBudgets');
const getExpenses = require('./getExpenses');
const getGoals = require('./getGoals');
const getRevenues = require('./getRevenues');
const getStatistics = require('./getStatistics');

const registry = {
  getAccounts: getAccounts.getAccounts,
  getBudgets: getBudgets.getBudgets,
  getExpenses: getExpenses.getExpenses,
  getGoals: getGoals.getGoals,
  getRevenues: getRevenues.getRevenues,
  getStatistics: getStatistics.getStatistics,
};

async function executeTool(name, utilisateurId, params = {}) {
  const fn = registry[name];
  if (!fn) {
    return { success: false, message: `Outil "${name}" inconnu.` };
  }
  try {
    return await fn(utilisateurId, params);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getAvailableTools() {
  return Object.keys(registry).map((name) => ({
    name,
    category: 'lecture',
    description: getToolDescription(name),
  }));
}

function getToolDescription(name) {
  const descriptions = {
    getAccounts: 'Liste des comptes bancaires avec soldes et types',
    getBudgets: 'Budgets du mois avec prévisions, utilisation et restant',
    getExpenses: 'Dépenses du mois avec catégories et filtres',
    getGoals: 'Objectifs d\'épargne avec progression',
    getRevenues: 'Revenus du mois avec total et sources',
    getStatistics: 'Résumé statistique global des finances',
  };
  return descriptions[name] || '';
}

module.exports = {
  executeTool,
  getAvailableTools,
  ...registry,
};
