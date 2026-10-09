const { prisma } = require('../config/database');
const { createReceipt } = require('../models/receipt.model');

async function confirmPaidRegistration({ tournamentId, userId, paymentId, amount }) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== 'PUBLISHED') throw new Error('Tournament is not available');
    if (new Date() > tournament.registrationDeadline) throw new Error('Registration deadline has passed');
    if (amount !== tournament.entryFee.toString()) throw new Error('Payment amount does not match the entry fee');

    const existing = await tx.registration.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } }
    });
    if (existing) return existing;

    const count = await tx.registration.count({ where: { tournamentId, status: 'CONFIRMED' } });
    if (count >= tournament.capacity) throw new Error('Tournament capacity has been reached');

    const registration = await tx.registration.create({
      data: {
        tournamentId,
        userId,
        paymentId,
        tournamentNumber: `${tournament.code}-${String(count + 1).padStart(4, '0')}`,
        status: 'CONFIRMED'
      }
    });
    await createReceipt({
      registrationId: registration.id,
      receiptNumber: `REC-${registration.id.slice(0, 8).toUpperCase()}`
    }, tx);
    return registration;
  });
}

module.exports = { confirmPaidRegistration };
