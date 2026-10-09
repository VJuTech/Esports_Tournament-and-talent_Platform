const express = require('express');
const authRoutes = require('./auth.routes');
const tournamentController = require('../controllers/tournament.controller');
const playerController = require('../controllers/player.controller');
const adminController = require('../controllers/admin.controller');
const registrationRoutes = require('./registration.routes');
const paymentRoutes = require('./payment.routes');
const matchRoutes = require('./match.routes');
const profileRoutes = require('./profile.routes');
const { requireVerified, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/', (req, res) => res.render('index', { title: 'The competitive edge' }));
router.get('/home', (req, res) => res.render('home', { title: 'Home' }));
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/registrations', registrationRoutes);
router.use('/payments', paymentRoutes);
router.use('/matches', matchRoutes);
router.get('/tournaments', tournamentController.list);
router.get('/tournaments/:id', tournamentController.show);
router.get('/dashboard', requireVerified, playerController.dashboard);
router.get('/admin', requireRole('SUPER_ADMIN', 'TOURNAMENT_MANAGER'), adminController.dashboard);

module.exports = router;
