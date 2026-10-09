const { prisma } = require('../config/database');

function listPublishedTournaments() {
  return prisma.tournament.findMany({
    where: { status: 'PUBLISHED' },
    include: { game: true },
    orderBy: { registrationDeadline: 'asc' }
  });
}

function listManagedTournaments() {
  return prisma.tournament.findMany({
    include: { game: true, _count: { select: { registrations: true } } },
    orderBy: { updatedAt: 'desc' }
  });
}

function findTournamentById(id) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      game: true,
      registrations: { include: { user: true } },
      matches: { orderBy: [{ round: 'asc' }, { scheduledAt: 'asc' }] },
      _count: { select: { registrations: true } }
    }
  });
}

function createTournament(data) {
  return prisma.tournament.create({ data, include: { game: true } });
}

function updateTournament(id, data) {
  return prisma.tournament.update({ where: { id }, data, include: { game: true } });
}

module.exports = { listPublishedTournaments, listManagedTournaments, findTournamentById, createTournament, updateTournament };
