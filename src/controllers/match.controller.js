const { prisma } = require('../config/database');
const { progressVerifiedResult } = require('../services/knockout.service');

async function show(req, res, next) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { tournament: { include: { game: true } }, participants: { include: { user: true } }, results: { include: { submittedBy: true, approvedBy: true }, orderBy: { submittedAt: 'desc' } } }
    });
    if (!match) return res.status(404).render('404', { title: 'Match not found' });
    return res.render('matches/show', { title: `Match ${match.id.slice(0, 8)}`, match });
  } catch (error) { return next(error); }
}

async function submitResult(req, res) {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!match || ['CANCELLED', 'VERIFIED'].includes(match.status)) return res.status(400).send('Match cannot accept a result');
    const scores = JSON.parse(req.body.scores);
    if (!scores || typeof scores !== 'object' || Object.keys(scores).length !== match.participants.length) return res.status(400).send('Scores must include every participant');
    const result = await prisma.matchResult.create({ data: { matchId: match.id, submittedById: req.session.user.id, scores, evidenceUrl: req.body.evidenceUrl?.trim() || null } });
    await prisma.$transaction([
      prisma.match.update({ where: { id: match.id }, data: { status: 'AWAITING_RESULT' } }),
      prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'MATCH_RESULT_SUBMITTED', entity: 'Match', entityId: match.id, metadata: { resultId: result.id } } })
    ]);
    return res.redirect(`/matches/${match.id}`);
  } catch (error) { return res.status(400).send('Invalid score submission'); }
}

async function approveResult(req, res, next) {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id }, include: { participants: true, results: { where: { status: 'SUBMITTED' }, orderBy: { submittedAt: 'desc' }, take: 1 } } });
    const result = match?.results[0];
    if (!match || !result) return res.status(400).send('No submitted result is awaiting approval');
    if (match.bracketPosition) {
      await progressVerifiedResult({ matchId: match.id, resultId: result.id, actorId: req.session.user.id });
      await recalculateStandings(match.tournamentId);
      return res.redirect(`/matches/${match.id}`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.matchResult.update({ where: { id: result.id }, data: { status: 'VERIFIED', approvedById: req.session.user.id, approvedAt: new Date() } });
      await tx.match.update({ where: { id: match.id }, data: { status: 'VERIFIED', result: result.scores } });
      await tx.notification.createMany({ data: match.participants.map((participant) => ({ userId: participant.userId, type: 'MATCH_RESULT_VERIFIED', subject: 'A match result has been verified', body: `The result for match ${match.id.slice(0, 8).toUpperCase()} is now official.` })) });
      await tx.auditLog.create({ data: { actorId: req.session.user.id, action: 'MATCH_RESULT_VERIFIED', entity: 'Match', entityId: match.id, metadata: { resultId: result.id } } });
    });
    await recalculateStandings(match.tournamentId);
    return res.redirect(`/matches/${match.id}`);
  } catch (error) { return next(error); }
}

async function recalculateStandings(tournamentId) {
  const matches = await prisma.match.findMany({ where: { tournamentId, status: 'VERIFIED' }, include: { participants: true, results: { where: { status: 'VERIFIED' }, orderBy: { approvedAt: 'desc' }, take: 1 } } });
  const totals = new Map();
  for (const match of matches) {
    const scores = match.results[0]?.scores || {};
    const values = Object.values(scores).map(Number).filter(Number.isFinite);
    const max = Math.max(...values);
    for (const participant of match.participants) {
      const current = totals.get(participant.userId) || { points: 0, score: 0 };
      const score = Number(scores[participant.userId]);
      current.score += Number.isFinite(score) ? score : 0;
      if (Number.isFinite(score) && score === max) current.points += values.filter((value) => value === max).length > 1 ? 1 : 3;
      totals.set(participant.userId, current);
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.ranking.deleteMany({ where: { tournamentId } });
    const ordered = [...totals.entries()].sort((a, b) => b[1].points - a[1].points || b[1].score - a[1].score);
    for (const [index, [userId, stats]] of ordered.entries()) await tx.ranking.create({ data: { tournamentId, userId, position: index + 1, score: stats.points } });
  });
}

async function standings(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: { game: true } });
    if (!tournament) return res.status(404).render('404', { title: 'Tournament not found' });
    const rankings = await prisma.ranking.findMany({ where: { tournamentId: tournament.id }, include: { user: true }, orderBy: { position: 'asc' } });
    return res.render('tournaments/standings', { title: `${tournament.name} standings`, tournament, rankings });
  } catch (error) { return next(error); }
}

module.exports = { show, submitResult, approveResult, standings, recalculateStandings };
