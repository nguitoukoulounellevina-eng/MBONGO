const pool = require('../config/database');
const Period = require('../utils/period');

async function injectPeriod(req, res, next) {
  if (!req.utilisateurId) return next();
  try {
    const [[user]] = await pool.query(
      'SELECT periode_budget FROM utilisateurs WHERE id = ?',
      [req.utilisateurId]
    );
    req.period = new Period(user?.periode_budget);
  } catch {
    req.period = new Period('mensuel');
  }
  next();
}

module.exports = injectPeriod;
