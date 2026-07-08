const orchestrator = require('../services/ai/orchestrator.service');
const promptService = require('./prompt.service');

exports.getTodaySummary = async (utilisateurId) => {
  try {
    const stats = await orchestrator.processMessage(utilisateurId, 'résumé du jour');
    const data = stats.outils_utilises?.length > 0
      ? { revenus_mois: null, depenses_mois: null, epargne_totale: null, taux_epargne: null, nombre_comptes: null, objectifs_actifs: null }
      : null;
    return {
      date: new Date().toISOString().split('T')[0],
      resume: data,
      conseil: stats.reponse || 'Bienvenue sur Motéma.',
    };
  } catch {
    return {
      date: new Date().toISOString().split('T')[0],
      resume: null,
      conseil: 'Bienvenue sur Motéma.',
    };
  }
};

exports.chat = async (utilisateurId, message) => {
  const result = await orchestrator.processMessage(utilisateurId, message);
  return result;
};

exports.getHistory = async () => ({
  messages: [],
});

exports.clearHistory = async () => {};
