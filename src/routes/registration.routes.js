const express = require('express');
const controller = require('../controllers/registration.controller');
const { requireVerified } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/', requireVerified, controller.create);

module.exports = router;
