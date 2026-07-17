const { detecterTendances, genererRecommandations } = require('../services/trend-analysis.service');

async function getAlertes(req, res, next) {
  try {
    const alertes = await detecterTendances(req.utilisateurId);
    res.json(alertes);
  } catch (err) {
    next(err);
  }
}

async function getRecommandations(req, res, next) {
  try {
    const { categorieId } = req.params;
    const recommandations = await genererRecommandations(req.utilisateurId, parseInt(categorieId));
    res.json(recommandations);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAlertes, getRecommandations };
