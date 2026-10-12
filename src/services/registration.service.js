const { prisma } = require('../config/database');
const { createReceipt } = require('../models/receipt.model');
const env = require('../config/env');

async function confirmPaidRegistration({ tournamentId, userId, providerReference, amount, currency }) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== 'PUBLISHED') throw new Error('Tournament is not available');
    if (new Date() > tournament.registrationDeadline) throw new Error('Registration deadline has passed');
    if (amount !== tournament.entryFee.toString() || currency !== tournament.currency) throw new Error('Payment amount or currency does not match the entry fee');

    const existing = await tx.registration.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } }
    });
    if (existing?.status === 'CONFIRMED') return existing;
    if (existing && existing.status !== 'PENDING') throw new Error('Registration cannot be confirmed');

    const count = await tx.registration.count({ where: { tournamentId, status: 'CONFIRMED' } });
    if (count >= tournament.capacity) throw new Error('Tournament capacity has been reached');

    const sequenceRows = await tx.$queryRaw`UPDATE "Tournament" SET "nextTournamentNumber" = "nextTournamentNumber" + 1 WHERE "id" = ${tournament.id} RETURNING "nextTournamentNumber"`;
    const sequence = Number(sequenceRows[0].nextTournamentNumber) - 1;
    const payment = await tx.payment.upsert({
      where: { providerReference },
      update: { status: 'VERIFIED', verifiedAt: new Date(), amount, currency },
      create: { providerReference, amount, currency, status: 'VERIFIED', verifiedAt: new Date() }
    });
    const registration = existing
      ? await tx.registration.update({ where: { id: existing.id }, data: { paymentId: payment.id, tournamentNumber: `${tournament.code}-${String(sequence).padStart(4, '0')}`, status: 'CONFIRMED', confirmedAt: new Date() } })
      : await tx.registration.create({ data: { tournamentId, userId, paymentId: payment.id, tournamentNumber: `${tournament.code}-${String(sequence).padStart(4, '0')}`, status: 'CONFIRMED', feeAmount: tournament.entryFee, feeCurrency: tournament.currency, confirmedAt: new Date() } });
    const user = await tx.user.findUnique({ where: { id: userId } });
    await createReceipt({
      registrationId: registration.id,
      receiptNumber: `RCP-${new Date().getFullYear()}-${registration.id.slice(0, 8).toUpperCase()}`,
      companyName: env.COMPANY_NAME,
      companyContact: env.COMPANY_CONTACT,
      playerName: user.displayName,
      tournamentName: tournament.name,
      tournamentNumber: registration.tournamentNumber,
      description: 'Tournament registration fee',
      amount: tournament.entryFee,
      currency: tournament.currency,
      paymentDate: new Date(),
      paymentReference: providerReference,
      status: 'PAID'
    }, tx);
    return registration;
  }, { isolationLevel: 'Serializable' });
}

module.exports = { confirmPaidRegistration };
