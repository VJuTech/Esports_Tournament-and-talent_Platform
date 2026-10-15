const express = require('express');
const controller = require('../controllers/profile.controller');
const { requireVerified } = require('../middleware/auth.middleware');
const { imageUpload } = require('../middleware/upload.middleware');

const router = express.Router();
router.get('/', requireVerified, controller.show);
router.post('/', requireVerified, imageUpload.single('profileImage'), controller.update);

module.exports = router;
