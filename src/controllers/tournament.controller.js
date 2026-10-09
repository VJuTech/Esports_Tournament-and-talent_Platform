const { listPublishedTournaments } = require('../models/tournament.model');
const { getTournament } = require('../services/tournament.service');
const { prisma } = require('../config/database');

async function list(req, res, next) {
  try {
    return res.render('tournaments/index', { title: 'Tournaments', tournaments: await listPublishedTournaments() });
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const tournament = await getTournament(req.params.id);
    if (!tournament) return res.status(404).render('404', { title: 'Not found' });
    const teams = req.session.user && tournament.participationType === 'TEAM'
      ? await prisma.team.findMany({ where: { gameId: tournament.gameId, members: { some: { userId: req.session.user.id, status: 'ACTIVE' } } }, orderBy: { name: 'asc' } })
      : [];
    return res.render('tournaments/show', { title: tournament.name, tournament, teams, error: req.query.error || null });
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, show };
