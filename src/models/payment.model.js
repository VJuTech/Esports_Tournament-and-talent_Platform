const { prisma } = require('../config/database');

function findPaymentByProviderReference(providerReference) {
  return prisma.payment.findUnique({ where: { providerReference } });
}

module.exports = { findPaymentByProviderReference };
