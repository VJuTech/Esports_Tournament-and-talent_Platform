const { prisma } = require('../config/database');

async function dashboard(req, res, next) {
  try {
    const [players, tournaments, registrations, payments, refunds, matches, candidates, teams, incidents] = await Promise.all([
      prisma.user.count({ where: { role: 'PLAYER' } }),
      prisma.tournament.count({ where: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } } }),
      prisma.registration.count({ where: { status: 'CONFIRMED' } }),
      prisma.payment.count({ where: { status: { in: ['SUCCESSFUL', 'VERIFIED'] } } }),
      prisma.payment.count({ where: { status: 'REFUNDED' } }),
      prisma.match.count({ where: { status: { in: ['AWAITING_RESULT', 'DISPUTED'] } } }),
      prisma.scoutingEvaluation.count(),
      prisma.team.count(),
      prisma.auditLog.count({ where: { action: { contains: 'INCIDENT' } } })
    ]);
    return res.render('admin/dashboard', { title: 'Administration', metrics: { players, tournaments, registrations, payments, refunds, matches, candidates, teams, incidents } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { dashboard };
