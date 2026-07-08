const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const revenusController = require('../controllers/revenus.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/', revenusController.getAll);
router.get('/:id', revenusController.getById);
router.post('/', revenusController.create);
router.put('/:id', revenusController.update);
router.delete('/:id', revenusController.remove);

module.exports = router;
