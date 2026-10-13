const { prisma } = require('../config/database');

async function scouting(req, res, next) {
  try {
    const evaluations = await prisma.scoutingEvaluation.findMany({ include: { player: true, scout: true, game: true }, orderBy: { createdAt: 'desc' }, take: 200 });
    const players = await prisma.user.findMany({ where: { role: 'PLAYER', accountStatus: 'ACTIVE' }, orderBy: { displayName: 'asc' }, select: { id: true, displayName: true, email: true } });
    return res.render('admin/scouting/index', { title: 'Talent scouting', evaluations, players, error: req.query.error || null });
  } catch (error) { return next(error); }
}

async function evaluate(req, res, next) {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) return res.redirect('/admin/scouting?error=Rating%20must%20be%20between%201%20and%2010');
    await prisma.$transaction([
      prisma.scoutingEvaluation.create({ data: { playerId: req.body.playerId, scoutId: req.session.user.id, rating, strengths: req.body.strengths?.trim(), concerns: req.body.concerns?.trim(), notes: req.body.notes?.trim() } }),
      prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'SCOUTING_EVALUATION_CREATED', entity: 'User', entityId: req.body.playerId, metadata: { rating } } })
    ]);
    return res.redirect('/admin/scouting');
  } catch (error) { return next(error); }
}

async function decide(req, res, next) {
  try {
    await prisma.$transaction([
      prisma.selectionDecision.create({ data: { playerId: req.body.playerId, decisionById: req.session.user.id, cycle: req.body.cycle.trim(), status: req.body.status, criteria: req.body.criteria.trim(), notes: req.body.notes?.trim() } }),
      prisma.notification.create({ data: { userId: req.body.playerId, type: 'SCOUTING_DECISION', subject: `Your scouting decision: ${req.body.status}`, body: req.body.notes?.trim() || 'A scouting decision is available in your account.' } }),
      prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'SELECTION_DECISION_RECORDED', entity: 'User', entityId: req.body.playerId, metadata: { status: req.body.status, cycle: req.body.cycle } } })
    ]);
    return res.redirect('/admin/scouting');
  } catch (error) { return next(error); }
}

async function teams(req, res, next) {
  try {
    const [teams, games] = await Promise.all([
      prisma.team.findMany({ include: { game: true, manager: true, memberships: { include: { user: true }, orderBy: { joinedAt: 'desc' } } }, orderBy: { createdAt: 'desc' } }),
      prisma.game.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    ]);
    return res.render('admin/teams/index', { title: 'Team management', teams, games });
  } catch (error) { return next(error); }
}

async function createTeam(req, res, next) {
  try {
    await prisma.team.create({ data: { name: req.body.name.trim(), gameId: req.body.gameId, managerId: req.session.user.id } });
    return res.redirect('/admin/teams');
  } catch (error) { return next(error); }
}

async function addMember(req, res, next) {
  try {
    const existing = await prisma.teamMembership.findFirst({ where: { teamId: req.params.id, userId: req.body.userId, status: { in: ['INVITED', 'SELECTED', 'ACCEPTED', 'RESERVE'] } } });
    if (!existing) await prisma.teamMembership.create({ data: { teamId: req.params.id, userId: req.body.userId, status: req.body.status || 'INVITED' } });
    return res.redirect('/admin/teams');
  } catch (error) { return next(error); }
}

module.exports = { scouting, evaluate, decide, teams, createTeam, addMember };
