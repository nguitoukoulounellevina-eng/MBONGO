const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const analyseIaController = require('../controllers/analyse-ia.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/derniere', analyseIaController.getDerniere);
router.get('/historique', analyseIaController.getHistorique);
router.get('/comparer', analyseIaController.comparer);
router.post('/generer', analyseIaController.generer);
router.post('/analyser-complet', analyseIaController.analyserComplet);

module.exports = router;
