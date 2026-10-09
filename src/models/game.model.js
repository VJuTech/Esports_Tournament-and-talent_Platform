const { prisma } = require('../config/database');

function listGames(includeInactive = false) {
  return prisma.game.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: 'asc' }
  });
}

function findGameById(id) {
  return prisma.game.findUnique({ where: { id } });
}

function createGame(data) {
  return prisma.game.create({ data });
}

function updateGame(id, data) {
  return prisma.game.update({ where: { id }, data });
}

module.exports = { listGames, findGameById, createGame, updateGame };
