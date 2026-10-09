const { prisma } = require('../config/database');

function listPublishedTournaments() {
  return prisma.tournament.findMany({
    where: { status: 'PUBLISHED' },
    include: { game: true },
    orderBy: { registrationDeadline: 'asc' }
  });
}

module.exports = { listPublishedTournaments };
