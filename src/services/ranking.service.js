const { prisma } = require('../config/database');

function getPublishedRankings(tournamentId) {
  return prisma.ranking.findMany({
    where: { tournamentId },
    include: { user: true },
    orderBy: { position: 'asc' }
  });
}

module.exports = { getPublishedRankings };
