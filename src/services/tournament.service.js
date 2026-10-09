const { prisma } = require('../config/database');

function getTournament(id) {
  return prisma.tournament.findUnique({ where: { id }, include: { game: true } });
}

module.exports = { getTournament };
