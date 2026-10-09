const { prisma } = require('../config/database');

function createRegistration(data, tx = prisma) {
  return tx.registration.create({ data });
}

module.exports = { createRegistration };
