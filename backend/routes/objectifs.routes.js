const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const objectifsController = require('../controllers/objectifs.controller');

router.use(auth);

router.get('/', objectifsController.getAll);
router.get('/:id', objectifsController.getById);
router.post('/', objectifsController.create);
router.put('/:id', objectifsController.update);
router.delete('/:id', objectifsController.remove);
router.post('/:id/alimenter', objectifsController.alimenter);
router.get('/:id/alimentations', objectifsController.getAlimentations);

module.exports = router;
