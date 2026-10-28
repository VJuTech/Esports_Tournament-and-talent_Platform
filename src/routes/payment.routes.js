const express = require('express');
const controller = require('../controllers/payment.controller');
const { requireVerified } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/checkout/:registrationId', requireVerified, controller.checkout);
router.post('/checkout/:registrationId/confirm', requireVerified, controller.reportBankTransfer);
router.get('/return', requireVerified, controller.paymentReturn);
router.post('/webhook', controller.webhook);
router.post('/webhooks/:provider', controller.webhook);

module.exports = router;
