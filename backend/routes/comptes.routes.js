const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const comptesController = require('../controllers/comptes.controller');

router.use(auth);

router.get('/', comptesController.getAll);
router.get('/:id', comptesController.getById);
router.post('/', comptesController.create);
router.put('/:id', comptesController.update);
router.delete('/:id', comptesController.remove);

module.exports = router;
