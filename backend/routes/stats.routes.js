const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const statsController = require('../controllers/stats.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/resume', statsController.getResume);
router.get('/repartition', statsController.getRepartition);
router.get('/evolution', statsController.getEvolution);
router.get('/tendances-categories', statsController.getTendancesCategories);

module.exports = router;
