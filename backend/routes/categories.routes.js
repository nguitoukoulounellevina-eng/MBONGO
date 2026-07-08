const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const categoriesController = require('../controllers/categories.controller');

router.use(auth);

router.get('/', categoriesController.getAll);
router.get('/:id', categoriesController.getById);
router.post('/', categoriesController.create);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.remove);
router.post('/:id/toggle-quotidien', categoriesController.toggleQuotidien);

module.exports = router;
