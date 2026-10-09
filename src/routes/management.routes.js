const express = require('express');
const gameController = require('../controllers/game.controller');
const tournamentController = require('../controllers/management.controller');
const { requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const managersOnly = requireRole('SUPER_ADMIN', 'TOURNAMENT_MANAGER');

router.use(managersOnly);
router.get('/games', gameController.index);
router.get('/games/new', gameController.newGame);
router.post('/games', gameController.create);
router.get('/games/:id/edit', gameController.edit);
router.post('/games/:id', gameController.update);
router.post('/games/:id/toggle', gameController.toggle);
router.get('/tournaments', tournamentController.index);
router.get('/tournaments/new', tournamentController.newTournament);
router.post('/tournaments', tournamentController.create);
router.get('/tournaments/:id/competition', tournamentController.competition);
router.get('/tournaments/:id/edit', tournamentController.edit);
router.post('/tournaments/:id', tournamentController.update);
router.post('/tournaments/:id/transition', tournamentController.transition);

module.exports = router;
