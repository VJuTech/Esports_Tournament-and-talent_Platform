const { prisma } = require('../config/database');

function listGames() {
  return prisma.game.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

module.exports = { listGames };
