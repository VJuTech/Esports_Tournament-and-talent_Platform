const { prisma } = require('../config/database');
const { createReceipt } = require('../models/receipt.model');

async function confirmPaidRegistration({ tournamentId, userId, paymentId, amount }) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== 'PUBLISHED') throw new Error('Tournament is not available');
    if (new Date() > tournament.registrationDeadline) throw new Error('Registration deadline has passed');
    if (amount !== tournament.entryFee.toString()) throw new Error('Payment amount does not match the entry fee');
    await tx.payment.update({ where: { id: paymentId }, data: { status: 'SUCCESSFUL', verifiedAt: new Date() } });

    const existing = await tx.registration.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } }
    });
    if (existing?.status === 'CONFIRMED') return existing;
    if (existing && existing.status !== 'PENDING') throw new Error('Registration cannot be confirmed');

    const count = await tx.registration.count({ where: { tournamentId, status: 'CONFIRMED' } });
    if (count >= tournament.capacity) throw new Error('Tournament capacity has been reached');

    const sequenceRows = await tx.$queryRaw`UPDATE "Tournament" SET "nextTournamentNumber" = "nextTournamentNumber" + 1 WHERE "id" = ${tournament.id} RETURNING "nextTournamentNumber"`;
    const sequence = Number(sequenceRows[0].nextTournamentNumber) - 1;
    const registration = existing
      ? await tx.registration.update({ where: { id: existing.id }, data: { paymentId, tournamentNumber: `${tournament.code}-${String(sequence).padStart(4, '0')}`, status: 'CONFIRMED', confirmedAt: new Date() } })
      : await tx.registration.create({ data: { tournamentId, userId, paymentId, tournamentNumber: `${tournament.code}-${String(sequence).padStart(4, '0')}`, status: 'CONFIRMED', feeAmount: tournament.entryFee, feeCurrency: tournament.currency, confirmedAt: new Date() } });
    await createReceipt({
      registrationId: registration.id,
      receiptNumber: `REC-${registration.id.slice(0, 8).toUpperCase()}`
    }, tx);
    return registration;
  }, { isolationLevel: 'Serializable' });
}

module.exports = { confirmPaidRegistration };
