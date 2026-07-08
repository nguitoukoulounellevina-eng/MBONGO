const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const abonnementsController = require('../controllers/abonnements.controller');

router.use(auth);

router.get('/', abonnementsController.getAll);

module.exports = router;
