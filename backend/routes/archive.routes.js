const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const archiveController = require('../controllers/archive.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/periods', archiveController.getPeriods);
router.get('/summary', archiveController.getMonthSummary);

module.exports = router;
