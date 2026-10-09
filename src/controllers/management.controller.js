const { prisma } = require('../config/database');
const { listGames } = require('../models/game.model');
const { listManagedTournaments, findTournamentById, createTournament, updateTournament } = require('../models/tournament.model');

const transitions = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

function parseDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date;
}

function tournamentData(body, userId) {
  const registrationOpensAt = parseDate(body.registrationOpensAt);
  const registrationDeadline = parseDate(body.registrationDeadline);
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  const entryFee = Number(body.entryFee);
  const capacity = Number(body.capacity);
  const minimumAge = body.eligibilityMinimumAge ? Number(body.eligibilityMinimumAge) : null;
  const matchDuration = body.matchDurationMinutes ? Number(body.matchDurationMinutes) : null;
  if (!Number.isFinite(entryFee) || entryFee < 0) throw new Error('Entry fee must be zero or greater');
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Capacity must be a positive whole number');
  if (minimumAge !== null && (!Number.isInteger(minimumAge) || minimumAge < 0)) throw new Error('Minimum age is invalid');
  if (matchDuration !== null && (!Number.isInteger(matchDuration) || matchDuration < 1)) throw new Error('Match duration is invalid');
  if (registrationOpensAt >= registrationDeadline || registrationDeadline > startsAt || startsAt >= endsAt) throw new Error('Registration and tournament dates must be chronological');
  return {
    code: body.code.trim().toUpperCase(),
    name: body.name.trim(),
    description: body.description?.trim() || null,
    format: body.format,
    participationType: body.participationType,
    entryFee,
    currency: body.currency.trim().toUpperCase(),
    registrationOpensAt,
    registrationDeadline,
    startsAt,
    endsAt,
    capacity,
    eligibilityMinimumAge: minimumAge,
    eligibilityRequirements: body.eligibilityRequirements?.trim() || null,
    scoringRules: body.scoringRules?.trim() || null,
    matchDurationMinutes: matchDuration,
    schedulingRules: body.schedulingRules?.trim() || null,
    reportingRules: body.reportingRules?.trim() || null,
    prizeInformation: body.prizeInformation?.trim() || null,
    refundPolicy: body.refundPolicy?.trim() || null,
    terms: body.terms?.trim() || null,
    disputeDeadline: body.disputeDeadline ? parseDate(body.disputeDeadline) : null,
    gameId: body.gameId,
    createdById: userId
  };
}

function renderForm(res, data) {
  return res.render('admin/tournaments/form', { title: data.tournament ? 'Edit tournament' : 'Create tournament', ...data });
}

async function index(req, res, next) {
  try {
    return res.render('admin/tournaments/index', { title: 'Tournament management', tournaments: await listManagedTournaments() });
  } catch (error) {
    return next(error);
  }
}

async function newTournament(req, res, next) {
  try {
    return renderForm(res, { tournament: null, games: await listGames(), error: null });
  } catch (error) {
    return next(error);
  }
}

async function edit(req, res, next) {
  try {
    const tournament = await findTournamentById(req.params.id);
    if (!tournament) return res.status(404).render('404', { title: 'Tournament not found' });
    return renderForm(res, { tournament, games: await listGames(), error: null });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = tournamentData(req.body, req.session.user.id);
    await createTournament(data);
    return res.redirect('/admin/tournaments');
  } catch (error) {
    return renderForm(res.status(400), { tournament: req.body, games: await listGames(), error: error.message });
  }
}

async function update(req, res, next) {
  try {
    const current = await findTournamentById(req.params.id);
    if (!current) return res.status(404).render('404', { title: 'Tournament not found' });
    const data = tournamentData(req.body, current.createdById);
    delete data.createdById;
    const changedPublishedRules = current.status === 'PUBLISHED' && (
      current.registrationDeadline.getTime() !== data.registrationDeadline.getTime() ||
      current.startsAt.getTime() !== data.startsAt.getTime() ||
      current.endsAt.getTime() !== data.endsAt.getTime() ||
      current.terms !== data.terms
    );
    await updateTournament(req.params.id, data);
    await prisma.auditLog.create({
      data: { actorId: req.session.user.id, action: changedPublishedRules ? 'PUBLISHED_TOURNAMENT_RULES_CHANGED' : 'TOURNAMENT_UPDATED', entity: 'Tournament', entityId: req.params.id, metadata: { communicated: false } }
    });
    return res.redirect('/admin/tournaments');
  } catch (error) {
    return renderForm(res.status(400), { tournament: { ...req.body, id: req.params.id }, games: await listGames(), error: error.message });
  }
}

async function transition(req, res, next) {
  try {
    const tournament = await findTournamentById(req.params.id);
    const nextStatus = req.body.status;
    if (!tournament || !transitions[tournament.status]?.includes(nextStatus)) return res.status(400).render('500', { title: 'Invalid tournament transition' });
    if (nextStatus === 'PUBLISHED') {
      const required = ['name', 'format', 'gameId', 'currency', 'terms', 'prizeInformation'];
      if (required.some((field) => !tournament[field]) || tournament.endsAt <= tournament.startsAt) return res.status(400).render('500', { title: 'Tournament is missing mandatory settings' });
    }
    await updateTournament(tournament.id, { status: nextStatus, publishedAt: nextStatus === 'PUBLISHED' ? new Date() : tournament.publishedAt });
    await prisma.auditLog.create({
      data: { actorId: req.session.user.id, action: `TOURNAMENT_${nextStatus}`, entity: 'Tournament', entityId: tournament.id, metadata: { from: tournament.status, to: nextStatus } }
    });
    return res.redirect('/admin/tournaments');
  } catch (error) {
    return next(error);
  }
}

async function competition(req, res, next) {
  try {
    const tournament = await findTournamentById(req.params.id);
    if (!tournament) return res.status(404).render('404', { title: 'Tournament not found' });
    return res.render('admin/tournaments/competition', {
      title: `${tournament.name} competition`,
      tournament,
      matches: tournament.matches
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { index, newTournament, edit, create, update, transition, competition };
