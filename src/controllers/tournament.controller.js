const { listPublishedTournaments } = require('../models/tournament.model');
const { getTournament } = require('../services/tournament.service');

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
    return res.render('tournaments/show', { title: tournament.name, tournament });
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, show };
