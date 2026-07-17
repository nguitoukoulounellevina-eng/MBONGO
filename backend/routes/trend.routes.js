const router = require('express').Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const ctrl = require('../controllers/trend.controller');

router.get('/alertes', auth, injectPeriod, ctrl.getAlertes);
router.get('/recommandations/:categorieId', auth, injectPeriod, ctrl.getRecommandations);

module.exports = router;
