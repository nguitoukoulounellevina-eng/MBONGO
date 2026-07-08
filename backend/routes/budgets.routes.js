const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const budgetsController = require('../controllers/budgets.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/', budgetsController.getAll);
router.get('/:id', budgetsController.getById);
router.post('/', budgetsController.create);
router.put('/:id', budgetsController.update);
router.delete('/:id', budgetsController.remove);

module.exports = router;
