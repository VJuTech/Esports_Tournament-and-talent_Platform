const express = require('express');
const controller = require('../controllers/profile.controller');
const { requireVerified } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/', requireVerified, controller.show);
router.post('/', requireVerified, controller.update);

module.exports = router;
