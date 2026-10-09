const { prisma } = require('../config/database');

function findMatch(id) {
  return prisma.match.findUnique({ where: { id }, include: { tournament: true } });
}

module.exports = { findMatch };
