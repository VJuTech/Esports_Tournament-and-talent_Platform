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
    return res.render('admin/records', { title: 'User accounts', heading: 'Authorized accounts', records, columns: ['displayName', 'email', 'role', 'accountStatus'] });
  } catch (error) { return next(error); }
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
    const records = await prisma.registration.findMany({ include: { user: true, tournament: true }, orderBy: { createdAt: 'desc' }, take: 200 });
    return res.render('admin/records', { title: 'Registrations', heading: 'Participant registrations', records, columns: ['id', 'status', 'tournamentNumber', 'createdAt'] });
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

module.exports = { notifications, users, auditLogs, report, registrations, receipts, matches };
