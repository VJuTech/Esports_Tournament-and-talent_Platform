const { prisma } = require('../config/database');

function listActiveGames() {
  return prisma.game.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

function upsertGameProfile(userId, gameId, inGameId) {
  return prisma.gameProfile.upsert({
    where: { userId_gameId: { userId, gameId } },
    create: { userId, gameId, inGameId },
    update: { inGameId }
  });
}

module.exports = { listActiveGames, upsertGameProfile };
