const express = require('express');
const controller = require('../controllers/match.controller');
const { requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/:id', requireRole('PLAYER', 'TOURNAMENT_OFFICIAL', 'REFEREE', 'TOURNAMENT_MANAGER', 'SUPER_ADMIN'), controller.show);
router.post('/:id/result', requireRole('TOURNAMENT_OFFICIAL', 'REFEREE', 'TOURNAMENT_MANAGER', 'SUPER_ADMIN'), controller.submitResult);
router.post('/:id/approve', requireRole('TOURNAMENT_OFFICIAL', 'TOURNAMENT_MANAGER', 'SUPER_ADMIN'), controller.approveResult);

module.exports = router;
