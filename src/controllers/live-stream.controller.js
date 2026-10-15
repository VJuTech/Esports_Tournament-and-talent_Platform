const { prisma } = require('../config/database');
const env = require('../config/env');

async function landing(req, res, next) {
  try {
    if (env.NODE_ENV === 'test') return res.render('index', { title: 'The competitive edge', liveStreams: [] });
    const liveStreams = await prisma.tournamentStream.findMany({
      where: { isEnabled: true, status: 'LIVE', tournament: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } } },
      include: { tournament: { include: { game: true } } },
      orderBy: { startedAt: 'desc' },
      take: 3
    });
    return res.render('index', { title: 'The competitive edge', liveStreams });
  } catch (error) { return next(error); }
}

async function watch(req, res, next) {
  try {
    const streams = await prisma.tournamentStream.findMany({
      where: { isEnabled: true, status: 'LIVE', tournament: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } } },
      include: { tournament: { include: { game: true } } },
      orderBy: { startedAt: 'desc' }
    });
    return res.render('live/index', { title: 'Live tournament coverage', streams });
  } catch (error) { return next(error); }
}

async function camera(req, res, next) {
  try {
    const stream = await prisma.tournamentStream.findFirst({
      where: { tournamentId: req.params.id, isEnabled: true, status: 'LIVE', ingestUrl: { not: null } },
      include: { tournament: { include: { game: true } } }
    });
    if (!stream) return res.status(403).render('403', { title: 'Live camera access unavailable' });
    return res.render('official/camera', { title: `${stream.tournament.name} camera`, stream });
  } catch (error) { return next(error); }
}

async function adminIndex(req, res, next) {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } },
      include: { game: true, stream: true },
      orderBy: { startsAt: 'asc' }
    });
    return res.render('admin/live/index', { title: 'Live coverage control', tournaments });
  } catch (error) { return next(error); }
}

module.exports = { landing, watch, camera, adminIndex };
