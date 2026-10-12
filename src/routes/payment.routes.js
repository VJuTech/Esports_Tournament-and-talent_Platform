const express = require('express');
const controller = require('../controllers/payment.controller');
const { requireVerified } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/checkout/:registrationId', requireVerified, controller.checkout);
router.get('/return', requireVerified, controller.paymentReturn);
router.post('/webhook', controller.webhook);

module.exports = router;
