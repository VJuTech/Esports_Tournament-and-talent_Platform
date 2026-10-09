const { prisma } = require('../config/database');

function listTeams() {
  return prisma.team.findMany({ include: { members: true }, orderBy: { name: 'asc' } });
}

module.exports = { listTeams };
