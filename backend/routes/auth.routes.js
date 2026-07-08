const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const bruteforce = require('../middleware/bruteforce');

router.post(
  '/register',
  [
    body('prenom').notEmpty().withMessage('Le prénom est obligatoire.'),
    body('nom').notEmpty().withMessage('Le nom est obligatoire.'),
    body('email').isEmail().withMessage('Email invalide.'),
    body('mot_de_passe').isLength({ min: 6 }).withMessage('Minimum 6 caractères.'),
  ],
  authController.register
);

router.post(
  '/login',
  bruteforce.check,
  [
    body('mot_de_passe').notEmpty().withMessage('Mot de passe obligatoire.'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email invalide.'),
    body('telephone').optional({ values: 'falsy' }).notEmpty().withMessage('Téléphone obligatoire.'),
  ],
  authController.login
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Email invalide.'),
  ],
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token obligatoire.'),
    body('mot_de_passe').isLength({ min: 6 }).withMessage('Minimum 6 caractères.'),
  ],
  authController.resetPassword
);

module.exports = router;
