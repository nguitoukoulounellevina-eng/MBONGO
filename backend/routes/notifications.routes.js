const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

router.use(auth);

router.get('/', notificationsController.getAll);
router.get('/non-lues', notificationsController.getNonLues);
router.delete('/:id', notificationsController.supprimer);
router.put('/:id/lire', notificationsController.marquerLue);
router.put('/tout-lire', notificationsController.marquerToutesLues);
router.post('/', notificationsController.creerNotification);

module.exports = router;
