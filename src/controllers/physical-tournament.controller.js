const { prisma } = require('../config/database');
const { generateKnockoutDraw, roundName } = require('../services/knockout.service');

function validStreamUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Stream URL must use HTTP or HTTPS');
  return url.toString();
}

async function publicBracket(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        game: true,
        rulebook: true,
        timetable: true,
        stream: true,
        matches: { include: { participants: { include: { user: true } } }, orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }] }
      }
    });
    if (!tournament || !['PUBLISHED', 'IN_PROGRESS', 'COMPLETED'].includes(tournament.status)) return res.status(404).render('404', { title: 'Tournament not found' });
    const totalRounds = tournament.matches.length ? Math.max(...tournament.matches.map((match) => match.round)) : 0;
    return res.render('tournaments/bracket', { title: `${tournament.name} draw`, tournament, totalRounds, roundName });
  } catch (error) { return next(error); }
}

async function publicTimetable(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: { game: true, timetable: true, matches: { include: { participants: { include: { user: true } } }, orderBy: { scheduledAt: 'asc' } } } });
    if (!tournament || !tournament.timetable?.publishedAt) return res.status(404).render('404', { title: 'Timetable not available' });
    return res.render('tournaments/timetable', { title: `${tournament.name} timetable`, tournament });
  } catch (error) { return next(error); }
}

async function operator(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: { game: true, rulebook: true, timetable: true, stream: true, registrations: { where: { status: 'CONFIRMED' }, include: { user: true } }, matches: { include: { participants: { include: { user: true } } }, orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }] } }
    });
    if (!tournament) return res.status(404).render('404', { title: 'Tournament not found' });
    return res.render('admin/tournaments/operator', { title: `${tournament.name} operator`, tournament, error: req.query.error || null });
  } catch (error) { return next(error); }
}

async function generateDraw(req, res, next) {
  try {
    await generateKnockoutDraw({ tournamentId: req.params.id, actorId: req.session.user.id });
    return res.redirect(`/admin/tournaments/${req.params.id}/operator`);
  } catch (error) { return res.redirect(`/admin/tournaments/${req.params.id}/operator?error=${encodeURIComponent(error.message)}`); }
}

async function saveRulebook(req, res, next) {
  try {
    await prisma.$transaction([
      prisma.tournamentRulebook.upsert({ where: { tournamentId: req.params.id }, update: { title: req.body.title.trim(), content: req.body.content.trim(), publishedAt: req.body.publish === 'true' ? new Date() : undefined }, create: { tournamentId: req.params.id, title: req.body.title.trim(), content: req.body.content.trim(), publishedAt: req.body.publish === 'true' ? new Date() : null } }),
      prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'TOURNAMENT_RULEBOOK_UPDATED', entity: 'Tournament', entityId: req.params.id } })
    ]);
    return res.redirect(`/admin/tournaments/${req.params.id}/operator`);
  } catch (error) { return next(error); }
}

async function publishTimetable(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: { registrations: { where: { status: 'CONFIRMED' } } } });
    if (!tournament) return res.status(404).render('404', { title: 'Tournament not found' });
    await prisma.$transaction([
      prisma.tournamentTimetable.upsert({ where: { tournamentId: tournament.id }, update: { notes: req.body.notes?.trim() || null, publishedAt: new Date() }, create: { tournamentId: tournament.id, notes: req.body.notes?.trim() || null, publishedAt: new Date() } }),
      prisma.notification.createMany({ data: tournament.registrations.map((registration) => ({ userId: registration.userId, tournamentId: tournament.id, type: 'TIMETABLE_PUBLISHED', subject: `${tournament.name} timetable is published`, body: 'Your match timetable and opponent draw are ready to view.' })) }),
      prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'TOURNAMENT_TIMETABLE_PUBLISHED', entity: 'Tournament', entityId: tournament.id } })
    ]);
    return res.redirect(`/admin/tournaments/${tournament.id}/operator`);
  } catch (error) { return next(error); }
}

async function saveStream(req, res, next) {
  try {
    const sourceUrl = validStreamUrl(req.body.sourceUrl);
    const ingestUrl = req.body.ingestUrl?.trim() ? validStreamUrl(req.body.ingestUrl) : null;
    const status = ['OFFLINE', 'LIVE', 'ENDED'].includes(req.body.status) ? req.body.status : 'OFFLINE';
    const isEnabled = req.body.isEnabled === 'true';
    if (isEnabled && status !== 'LIVE') throw new Error('Set stream status to LIVE before enabling public coverage.');
    await prisma.tournamentStream.upsert({
      where: { tournamentId: req.params.id },
      update: { title: req.body.title.trim(), sourceUrl, ingestUrl, provider: req.body.provider.trim(), status, isEnabled, startedAt: status === 'LIVE' ? new Date() : undefined, endedAt: status === 'ENDED' ? new Date() : undefined },
      create: { tournamentId: req.params.id, title: req.body.title.trim(), sourceUrl, ingestUrl, provider: req.body.provider.trim(), status, isEnabled, startedAt: status === 'LIVE' ? new Date() : null }
    });
    await prisma.auditLog.create({ data: { actorId: req.session.user.id, action: isEnabled ? 'TOURNAMENT_STREAM_ENABLED' : 'TOURNAMENT_STREAM_UPDATED', entity: 'Tournament', entityId: req.params.id, metadata: { status, isEnabled } } });
    return res.redirect(`/admin/tournaments/${req.params.id}/operator`);
  } catch (error) { return res.redirect(`/admin/tournaments/${req.params.id}/operator?error=${encodeURIComponent(error.message)}`); }
}

module.exports = { publicBracket, publicTimetable, operator, generateDraw, saveRulebook, publishTimetable, saveStream };
