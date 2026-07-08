const aiService = require('./ai.service');

exports.getToday = async (req, res, next) => {
  try {
    const summary = await aiService.getTodaySummary(req.utilisateurId);
    res.json(summary);
  } catch (err) { next(err); }
};

exports.chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Le champ "message" est obligatoire.' });
    }
    const response = await aiService.chat(req.utilisateurId, message.trim());
    res.json(response);
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const history = await aiService.getHistory(req.utilisateurId);
    res.json(history);
  } catch (err) { next(err); }
};

exports.deleteHistory = async (req, res, next) => {
  try {
    await aiService.clearHistory(req.utilisateurId);
    res.json({ message: 'Historique effacé.' });
  } catch (err) { next(err); }
};
