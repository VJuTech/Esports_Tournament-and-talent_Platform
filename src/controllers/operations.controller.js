const { prisma } = require('../config/database');

async function notifications(req, res, next) {
  try {
    const records = await prisma.notification.findMany({ where: { userId: req.session.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    return res.render('notifications/index', { title: 'Notifications', notifications: records });
  } catch (error) { return next(error); }
}

async function users(req, res, next) {
  try {
    const records = await prisma.user.findMany({ select: { id: true, displayName: true, email: true, role: true, accountStatus: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 200 });
    return res.render('admin/records', { title: 'User accounts', heading: 'Authorized accounts', records, columns: ['displayName', 'email', 'role', 'accountStatus'], showUserActions: true, error: req.query.error || null, notice: req.query.updated ? 'Account status updated.' : null });
  } catch (error) { return next(error); }
}

async function updateUserAccount(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, accountStatus: true }
    });
    if (!user) return res.status(404).redirect('/admin/users?error=User%20not%20found');
    if (user.id === req.session.user.id) {
      return res.status(400).redirect('/admin/users?error=You%20cannot%20change%20your%20own%20account');
    }

    const transitions = {
      suspend: { from: 'ACTIVE', to: 'SUSPENDED', action: 'USER_SUSPENDED' },
      unsuspend: { from: 'SUSPENDED', to: 'ACTIVE', action: 'USER_UNSUSPENDED' },
      delete: { from: ['ACTIVE', 'SUSPENDED'], to: 'DISABLED', action: 'USER_DELETED' }
    };
    const transition = transitions[req.params.action];
    const allowedFrom = Array.isArray(transition?.from) ? transition.from : [transition?.from];
    if (!transition || !allowedFrom.includes(user.accountStatus)) {
      return res.status(400).redirect('/admin/users?error=That%20account%20action%20is%20not%20available');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: transition.to, sessionVersion: { increment: 1 } }
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.session.user.id,
          action: transition.action,
          entity: 'User',
          entityId: user.id,
          metadata: { previousStatus: user.accountStatus, accountStatus: transition.to }
        }
      })
    ]);
    return res.redirect('/admin/users?updated=true');
  } catch (error) {
    return next(error);
  }
}

async function auditLogs(req, res, next) {
  try {
    const records = await prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: 'desc' }, take: 200 });
    return res.render('admin/records', { title: 'Audit logs', heading: 'Recent administrative actions', records, columns: ['action', 'entity', 'entityId', 'createdAt'] });
  } catch (error) { return next(error); }
}

async function report(req, res, next) {
  try {
    const records = await prisma.registration.findMany({ include: { user: true, tournament: true, payment: true }, orderBy: { createdAt: 'desc' } });
    const header = 'registration_id,player,tournament,status,payment_status,created_at';
    const rows = records.map((record) => [record.id, record.user.displayName, record.tournament.name, record.status, record.payment?.status || 'PENDING', record.createdAt.toISOString()].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    res.type('text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="registrations-report.csv"'); return res.send([header, ...rows].join('\n'));
  } catch (error) { return next(error); }
}

async function registrations(req, res, next) {
  try {
    const registrations = await prisma.registration.findMany({
      include: {
        user: true,
        tournament: true,
        payment: true,
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    const records = registrations.map((registration) => ({
      ...registration,
      player: registration.user.displayName,
      tournamentName: registration.tournament.name,
      paymentStatus: registration.payment?.status || registration.paymentAttempts[0]?.status || 'NOT_STARTED'
    }));
    return res.render('admin/records', {
      title: 'Registrations',
      heading: 'Participant registrations',
      records,
      columns: ['player', 'tournamentName', 'status', 'paymentStatus', 'tournamentNumber', 'createdAt']
    });
  } catch (error) { return next(error); }
}

async function receipts(req, res, next) {
  try {
    const records = await prisma.receipt.findMany({ orderBy: { issuedAt: 'desc' }, take: 200 });
    return res.render('admin/records', { title: 'Receipts', heading: 'Issued receipts', records, columns: ['receiptNumber', 'registrationId', 'status', 'issuedAt'] });
  } catch (error) { return next(error); }
}

async function matches(req, res, next) {
  try {
    const records = await prisma.match.findMany({ where: req.query.status ? { status: req.query.status } : undefined, orderBy: { scheduledAt: 'desc' }, take: 200 });
    return res.render('admin/records', { title: 'Matches', heading: req.query.status === 'DISPUTED' ? 'Disputed matches' : 'Match operations', records, columns: ['id', 'tournamentId', 'round', 'status', 'scheduledAt'] });
  } catch (error) { return next(error); }
}

module.exports = { notifications, users, updateUserAccount, auditLogs, report, registrations, receipts, matches };
