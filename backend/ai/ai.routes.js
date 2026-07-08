const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const aiController = require('./ai.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/today', aiController.getToday);
router.post('/chat', aiController.chat);
router.get('/history', aiController.getHistory);
router.delete('/history', aiController.deleteHistory);

module.exports = router;
