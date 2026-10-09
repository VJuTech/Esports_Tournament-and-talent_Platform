const express = require('express');
const controller = require('../controllers/registration.controller');
const { requireVerified } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/', requireVerified, controller.history);
router.get('/:id', requireVerified, controller.show);
router.post('/:id/cancel', requireVerified, controller.cancel);
router.post('/', requireVerified, controller.create);

module.exports = router;
