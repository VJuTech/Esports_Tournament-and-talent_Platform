const { prisma } = require('../config/database');
const { providerRequest } = require('../services/payment.service');
const { confirmPaidRegistration } = require('../services/registration.service');
const { deliverReceipt } = require('../services/receipt.service');

async function index(req, res, next) {
  try {
    const attempts = await prisma.paymentAttempt.findMany({
      include: { registration: { include: { user: true, tournament: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    return res.render('admin/payments/index', { title: 'Payment reconciliation', attempts });
  } catch (error) {
    return next(error);
  }
}

async function refund(req, res, next) {
  try {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { id: req.params.id }, include: { registration: true } });
    if (!attempt || !['VERIFIED', 'SUCCESSFUL'].includes(attempt.status)) return res.status(400).redirect('/admin/payments?error=Payment%20is%20not%20eligible%20for%20refund');
    const receipt = await prisma.receipt.findUnique({ where: { registrationId: attempt.registrationId } });
    if (!receipt) return res.status(409).redirect('/admin/payments?error=Receipt%20record%20is%20missing');
    await providerRequest(`/payments/${encodeURIComponent(attempt.providerReference)}/refund`, { method: 'POST' });
    await prisma.$transaction([
      prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'REFUNDED' } }),
      prisma.payment.updateMany({ where: { providerReference: attempt.providerReference }, data: { status: 'REFUNDED' } }),
      prisma.registration.update({ where: { id: attempt.registrationId }, data: { status: 'REFUNDED' } }),
      prisma.receipt.updateMany({ where: { registrationId: attempt.registrationId }, data: { status: 'REFUNDED' } }),
      prisma.receiptAdjustment.create({ data: { receiptId: receipt.id, type: 'REFUND', reference: attempt.providerReference, amount: attempt.amount, currency: attempt.currency, reason: 'Authorized refund' } }),
      prisma.auditLog.create({ data: { actorId: req.session.user.id, action: 'PAYMENT_REFUNDED', entity: 'PaymentAttempt', entityId: attempt.id, metadata: { providerReference: attempt.providerReference } } })
    ]);
    return res.redirect('/admin/payments');
  } catch (error) {
    return next(error);
  }
}

async function verifyBankTransfer(req, res, next) {
  try {
    const attempt = await prisma.paymentAttempt.findUnique({
      where: { id: req.params.id },
      include: { registration: true }
    });
    if (!attempt || attempt.provider !== 'BANK_TRANSFER' || attempt.status !== 'PROCESSING') {
      return res.status(400).redirect('/admin/payments?error=Transfer%20is%20not%20awaiting%20verification');
    }

    const registration = await confirmPaidRegistration({
      tournamentId: attempt.registration.tournamentId,
      userId: attempt.registration.userId,
      providerReference: attempt.providerReference,
      amount: String(attempt.amount),
      currency: attempt.currency
    });
    await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'VERIFIED', verifiedAt: new Date() }
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.session.user.id,
          action: 'BANK_TRANSFER_PAYMENT_VERIFIED',
          entity: 'PaymentAttempt',
          entityId: attempt.id,
          metadata: { registrationId: registration.id, providerReference: attempt.providerReference }
        }
      })
    ]);
    const receipt = await prisma.receipt.findUnique({ where: { registrationId: registration.id } });
    if (receipt) await deliverReceipt(receipt.id);
    return res.redirect('/admin/payments?verified=true');
  } catch (error) {
    return next(error);
  }
}

module.exports = { index, refund, verifyBankTransfer };
