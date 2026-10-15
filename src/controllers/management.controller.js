const { prisma } = require('../config/database');
const { listGames } = require('../models/game.model');
const { listManagedTournaments, findTournamentById, createTournament, updateTournament } = require('../models/tournament.model');
const { storeImage } = require('../services/image.service');

const transitions = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};
const supportedCurrencies = new Set(['NGN', 'USD', 'GBP', 'EUR', 'ZAR', 'GHS', 'KES']);

function parseDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date;
}

function tournamentData(body, userId, imageUrl) {
  const registrationOpensAt = parseDate(body.registrationOpensAt);
  const registrationDeadline = parseDate(body.registrationDeadline);
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  const entryFee = Number(body.entryFee);
  const capacity = Number(body.capacity);
  const minimumAge = body.eligibilityMinimumAge ? Number(body.eligibilityMinimumAge) : null;
  const matchDuration = body.matchDurationMinutes ? Number(body.matchDurationMinutes) : null;
  const currency = body.currency?.trim().toUpperCase();
  if (!Number.isFinite(entryFee) || entryFee < 0) throw new Error('Registration fee must be zero or greater');
  if (!supportedCurrencies.has(currency)) throw new Error('Select a supported currency');
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Capacity must be a positive whole number');
  if (minimumAge !== null && (!Number.isInteger(minimumAge) || minimumAge < 0)) throw new Error('Minimum age is invalid');
  if (matchDuration !== null && (!Number.isInteger(matchDuration) || matchDuration < 1)) throw new Error('Match duration is invalid');
  if (registrationOpensAt >= registrationDeadline || registrationDeadline > startsAt || startsAt >= endsAt) throw new Error('Registration and tournament dates must be chronological');
  return {
    code: body.code.trim().toUpperCase(),
    name: body.name.trim(),
    description: body.description?.trim() || null,
    imageUrl: imageUrl || null,
    format: body.format,
    participationType: body.participationType,
    entryFee,
    currency,
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
    const imageUrl = await storeImage(req.file, req.session.user.id);
    if (!imageUrl) throw new Error('A tournament image is required');
    const data = tournamentData(req.body, req.session.user.id, imageUrl);
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
    const data = tournamentData(req.body, current.createdById, (await storeImage(req.file, req.session.user.id)) || current.imageUrl);
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

async function createMatch(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: { registrations: { where: { status: 'CONFIRMED' } } } });
    if (!tournament) return res.status(404).send('Tournament not found');
    const participantIds = Array.isArray(req.body.participantIds) ? req.body.participantIds : [req.body.participantIds].filter(Boolean);
    if (participantIds.length < 2 || participantIds.length > 2) return res.status(400).send('A match requires two eligible participants');
    const eligible = tournament.registrations.every((registration) => participantIds.includes(registration.userId));
    if (!eligible) return res.status(400).send('Participants must have confirmed registrations');
    const match = await prisma.match.create({ data: { tournamentId: tournament.id, round: Number(req.body.round) || 1, scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null, status: 'SCHEDULED', participants: { create: participantIds.map((userId, seed) => ({ userId, seed: seed + 1 })) } } });
    await prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'MATCH_CREATED', entity: 'Match', entityId: match.id, metadata: { tournamentId: tournament.id } } });
    return res.redirect(`/admin/tournaments/${tournament.id}/competition`);
  } catch (error) { return next(error); }
}

module.exports = { index, newTournament, edit, create, update, transition, competition, createMatch };
