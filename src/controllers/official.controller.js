const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { progressVerifiedResult } = require('../services/knockout.service');
const { recalculateStandings } = require('./match.controller');

async function dashboard(req, res, next) {
  try {
    const [matches, liveStreams] = await Promise.all([
      prisma.match.findMany({
        where: {
          bracketPosition: { not: null },
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'AWAITING_RESULT'] },
          tournament: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } }
        },
        include: { tournament: { include: { game: true, stream: true } }, participants: { include: { user: true } } },
        orderBy: [{ scheduledAt: 'asc' }, { round: 'asc' }]
      }),
      prisma.tournamentStream.findMany({
        where: {
          isEnabled: true,
          status: 'LIVE',
          ingestUrl: { not: null },
          tournament: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } }
        },
        include: { tournament: { include: { game: true } } },
        orderBy: { startedAt: 'desc' }
      })
    ]);
    return res.render('official/dashboard', { title: 'Official control room', matches, liveStreams, error: req.query.error || null });
  } catch (error) { return next(error); }
}

async function submitVerifiedResult(req, res, next) {
  try {
    const winnerScore = Number(req.body.winnerScore);
    const loserScore = Number(req.body.loserScore);
    if (!Number.isFinite(winnerScore) || !Number.isFinite(loserScore) || winnerScore <= loserScore) {
      return res.redirect(`/official?error=${encodeURIComponent('The winner score must be higher than the loser score.')}`);
    }
    const match = await prisma.match.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!match || !['SCHEDULED', 'IN_PROGRESS', 'AWAITING_RESULT'].includes(match.status) || match.participants.length !== 2) {
      return res.redirect(`/official?error=${encodeURIComponent('This fixture is not ready for an official result.')}`);
    }
    const ids = new Set(match.participants.map((participant) => participant.userId));
    if (!ids.has(req.body.winnerId) || !ids.has(req.body.loserId) || req.body.winnerId === req.body.loserId) {
      return res.redirect(`/official?error=${encodeURIComponent('Choose the mapped winner and loser for this fixture.')}`);
    }
    const result = await prisma.matchResult.create({
      data: {
        matchId: match.id,
        submittedById: req.session.user.id,
        scores: { [req.body.winnerId]: winnerScore, [req.body.loserId]: loserScore },
        evidenceUrl: req.body.evidenceUrl?.trim() || null
      }
    });
    await progressVerifiedResult({ matchId: match.id, resultId: result.id, actorId: req.session.user.id });
    await recalculateStandings(match.tournamentId);
    await prisma.notification.createMany({
      data: match.participants.map((participant) => ({
        userId: participant.userId,
        tournamentId: match.tournamentId,
        type: 'OFFICIAL_RESULT_PUBLISHED',
        subject: 'Your official match result is published',
        body: 'Check the draw to see the verified result and the next fixture.'
      }))
    });
    return res.redirect('/official');
  } catch (error) { return next(error); }
}

async function newOfficial(req, res) {
  return res.render('admin/users/official-form', { title: 'Create tournament official', error: null, official: null });
}

async function createOfficial(req, res, next) {
  try {
    const password = String(req.body.password || '');
    if (password.length < 12) throw new Error('Temporary password must be at least 12 characters.');
    if (!['TOURNAMENT_OFFICIAL', 'REFEREE'].includes(req.body.role)) throw new Error('Select a valid tournament official role.');
    const official = await prisma.user.create({
      data: {
        email: req.body.email.trim().toLowerCase(),
        displayName: req.body.displayName.trim(),
        passwordHash: await bcrypt.hash(password, 12),
        role: req.body.role,
        accountStatus: 'ACTIVE',
        emailVerifiedAt: new Date()
      }
    });
    await prisma.auditLog.create({
      data: { actorId: req.session.user.id, action: 'TOURNAMENT_OFFICIAL_CREATED', entity: 'User', entityId: official.id, metadata: { role: official.role } }
    });
    return res.redirect('/admin/users');
  } catch (error) {
    if (error.code === 'P2002') error = new Error('An account with that email already exists.');
    return res.status(400).render('admin/users/official-form', { title: 'Create tournament official', error: error.message, official: req.body });
  }
}

module.exports = { dashboard, submitVerifiedResult, newOfficial, createOfficial };
