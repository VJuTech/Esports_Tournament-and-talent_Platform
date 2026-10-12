const express = require('express');
const controller = require('../controllers/receipt.controller');
const { requireVerified } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireVerified);
router.get('/:id', controller.show);
router.get('/:id/pdf', controller.pdf);
router.post('/:id/deliver', controller.retryDelivery);

module.exports = router;
