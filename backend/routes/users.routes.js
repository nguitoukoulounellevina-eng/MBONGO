const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const usersController = require('../controllers/users.controller');

router.get('/me', auth, usersController.getProfile);
router.put('/me', auth, usersController.updateProfile);
router.get('/me/periode', auth, usersController.getPeriode);
router.put('/me/periode', auth, usersController.updatePeriode);
router.put('/me/photo', auth, upload.single('photo'), usersController.uploadPhoto);
router.delete('/me/photo', auth, usersController.deletePhoto);

module.exports = router;
