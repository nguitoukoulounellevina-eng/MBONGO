const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const depensesController = require('../controllers/depenses.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/', depensesController.getAll);
router.get('/:id', depensesController.getById);
router.post('/', depensesController.create);
router.put('/:id', depensesController.update);
router.delete('/:id', depensesController.remove);

module.exports = router;
