const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/database');
const bruteforce = require('../middleware/bruteforce');

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation échouée.', errors: errors.array() });
    }

    const { prenom, nom, email, telephone, mot_de_passe } = req.body;

    const [existingEmail] = await pool.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }

    if (telephone) {
      const [existingPhone] = await pool.query('SELECT id FROM utilisateurs WHERE telephone = ?', [telephone]);
      if (existingPhone.length > 0) {
        return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé.' });
      }
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);

    const [result] = await pool.query(
      'INSERT INTO utilisateurs (prenom, nom, email, telephone, mot_de_passe, periode_budget) VALUES (?, ?, ?, ?, ?, ?)',
      [prenom, nom, email, telephone || null, hash, 'mensuel']
    );

    const defaultComptes = [
      { nom_compte: 'Mobile money', type_compte: 'momo' },
      { nom_compte: 'Airtel Money', type_compte: 'momo' },
      { nom_compte: 'Compte bancaire', type_compte: 'banque' },
      { nom_compte: 'Espèces', type_compte: 'especes' },
    ];
    for (const c of defaultComptes) {
      await pool.query(
        'INSERT INTO comptes (utilisateur_id, nom_compte, type_compte, solde_initial, solde_actuel, devise) VALUES (?, ?, ?, 0, 0, ?)',
        [result.insertId, c.nom_compte, c.type_compte, 'XAF']
      );
    }

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      message: 'Compte créé avec succès.',
      token,
      utilisateur: { id: result.insertId, prenom, nom, email, photo: null },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation échouée.', errors: errors.array() });
    }

    const { email, telephone, mot_de_passe } = req.body;

    const isEmail = email && email.includes('@');
    const field = isEmail ? 'email' : 'telephone';
    const value = isEmail ? email : telephone;

    const [rows] = await pool.query(
      `SELECT id, prenom, nom, email, telephone, photo, mot_de_passe FROM utilisateurs WHERE ${field} = ? AND est_actif = 1`,
      [value]
    );

    if (rows.length === 0) {
      const errMsg = isEmail ? 'Email ou mot de passe incorrect.' : 'Téléphone ou mot de passe incorrect.';
      return res.status(401).json({ message: errMsg });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!valid) {
      await bruteforce.enregistrerEchec(email, telephone);
      const errMsg = isEmail ? 'Email ou mot de passe incorrect.' : 'Téléphone ou mot de passe incorrect.';
      return res.status(401).json({ message: errMsg });
    }

    await bruteforce.reinitialiser(email, telephone);
    await pool.query('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      message: 'Connexion réussie.',
      token,
      utilisateur: {
        id: user.id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        photo: user.photo,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation échouée.', errors: errors.array() });
    }

    const { email } = req.body;

    const [rows] = await pool.query('SELECT id FROM utilisateurs WHERE email = ? AND est_actif = 1', [email]);

    if (rows.length > 0) {
      const token = jwt.sign({ id: rows[0].id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const resetLink = `http://localhost:3000/reset-password?token=${token}`;
      console.log(`\n🔗  [MOT DE PASSE OUBLIÉ] Lien de réinitialisation pour ${email} :`);
      console.log(`    ${resetLink}\n`);
      return res.json({ message: 'Un lien de réinitialisation vous a été envoyé par e-mail.', token });
    }

    res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation échouée.', errors: errors.array() });
    }

    const { token, mot_de_passe } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    if (decoded.type !== 'reset') {
      return res.status(400).json({ message: 'Token invalide.' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);
    await pool.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ? AND est_actif = 1', [hash, decoded.id]);

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    next(err);
  }
};
