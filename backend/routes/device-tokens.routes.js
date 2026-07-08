const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/device-tokens.controller');

router.use(auth);

router.post('/', controller.register);
router.delete('/:token', controller.unregister);

module.exports = router;
