const express = require('express');
const controller = require('../controllers/match.controller');
const { requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/:id/result', requireRole('TOURNAMENT_OFFICIAL', 'REFEREE', 'TOURNAMENT_MANAGER'), controller.submitResult);

module.exports = router;
