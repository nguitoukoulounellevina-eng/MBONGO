const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const injectPeriod = require('../middleware/injectPeriod');
const seuilsController = require('../controllers/seuils.controller');

router.use(auth);
router.use(injectPeriod);

router.get('/', seuilsController.getAll);
router.post('/', seuilsController.create);
router.delete('/:id', seuilsController.remove);
router.get('/check', seuilsController.check);

module.exports = router;
