const { prisma } = require('../config/database');

function createReceipt(data, tx = prisma) {
  return tx.receipt.create({ data });
}

module.exports = { createReceipt };
