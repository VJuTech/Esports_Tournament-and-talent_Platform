const express = require('express');
const controller = require('../controllers/official.controller');
const liveController = require('../controllers/live-stream.controller');
const { requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireRole('TOURNAMENT_OFFICIAL', 'REFEREE', 'TOURNAMENT_MANAGER', 'SUPER_ADMIN'));
router.get('/', controller.dashboard);
router.get('/tournaments/:id/camera', liveController.camera);
router.post('/matches/:id/result', controller.submitVerifiedResult);
module.exports = router;
