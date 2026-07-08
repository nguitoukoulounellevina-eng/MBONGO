const pool = require('../config/database');

exports.check = async (req, res, next) => {
  try {
    const { email, telephone } = req.body;
    const isEmail = email && email.includes('@');
    const field = isEmail ? 'email' : 'telephone';
    const value = isEmail ? email : telephone;
    if (!value) return next();

    const [rows] = await pool.query(
      `SELECT bloque_jusqua FROM utilisateurs WHERE ${field} = ? AND est_actif = 1`,
      [value]
    );

    if (rows.length > 0 && rows[0].bloque_jusqua) {
      const bloqueJusqua = new Date(rows[0].bloque_jusqua);
      if (bloqueJusqua > new Date()) {
        const minutes = Math.ceil((bloqueJusqua - new Date()) / 60000);
        return res.status(429).json({
          message: `Compte temporairement bloqué. Réessayez dans ${minutes} minute(s).`
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

exports.enregistrerEchec = async (email, telephone) => {
  try {
    const isEmail = email && email.includes('@');
    const field = isEmail ? 'email' : 'telephone';
    const value = isEmail ? email : telephone;
    if (!value) return;

    const [rows] = await pool.query(
      `SELECT tentatives_echec FROM utilisateurs WHERE ${field} = ? AND est_actif = 1`,
      [value]
    );
    if (rows.length === 0) return;

    const newCount = (rows[0].tentatives_echec || 0) + 1;
    if (newCount >= 5) {
      const bloqueJusqua = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query(
        `UPDATE utilisateurs SET tentatives_echec = ?, bloque_jusqua = ? WHERE ${field} = ?`,
        [newCount, bloqueJusqua, value]
      );
    } else {
      await pool.query(
        `UPDATE utilisateurs SET tentatives_echec = ? WHERE ${field} = ?`,
        [newCount, value]
      );
    }
  } catch (err) {
    console.error('bruteforce.enregistrerEchec error:', err.message);
  }
};

exports.reinitialiser = async (email, telephone) => {
  try {
    const isEmail = email && email.includes('@');
    const field = isEmail ? 'email' : 'telephone';
    const value = isEmail ? email : telephone;
    if (!value) return;

    await pool.query(
      `UPDATE utilisateurs SET tentatives_echec = 0, bloque_jusqua = NULL WHERE ${field} = ? AND est_actif = 1`,
      [value]
    );
  } catch (err) {
    console.error('bruteforce.reinitialiser error:', err.message);
  }
};
