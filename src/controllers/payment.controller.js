const { verifyWebhookSignature, createProviderReference, initiatePayment, verifyPaymentWithProvider } = require('../services/payment.service');
const { confirmPaidRegistration } = require('../services/registration.service');
const { prisma } = require('../config/database');
const env = require('../config/env');
const { deliverReceipt } = require('../services/receipt.service');

async function checkout(req, res, next) {
  try {
    const registration = await prisma.registration.findFirst({
      where: { id: req.params.registrationId, userId: req.session.user.id },
      include: { tournament: true, user: true }
    });
    if (!registration || !['PENDING', 'WAITLISTED'].includes(registration.status)) {
      return res.status(400).redirect(`/registrations/${req.params.registrationId}?error=Registration%20is%20not%20payable`);
    }
    if (new Date() > registration.tournament.registrationDeadline) {
      return res.status(400).redirect(`/registrations/${registration.id}?error=Registration%20deadline%20has%20passed`);
    }
    let attempt = await prisma.paymentAttempt.findFirst({
      where: { registrationId: registration.id, provider: 'BANK_TRANSFER', status: { in: ['PENDING', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' }
    });
    if (!attempt) {
      const reference = createProviderReference();
      attempt = await prisma.paymentAttempt.create({
        data: {
          registrationId: registration.id,
          providerReference: reference,
          amount: registration.feeAmount,
          currency: registration.feeCurrency,
          provider: 'BANK_TRANSFER',
          status: 'PENDING',
          providerPayload: { method: 'BANK_TRANSFER' }
        }
      });
    }

    const tournament = registration.tournament;
    if (!tournament.paymentBankName || !tournament.paymentAccountName || !tournament.paymentAccountNumber || !tournament.paymentAccountType) {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'FAILED', failureReason: 'Bank transfer details are not configured for this tournament' }
      });
      return res.status(400).redirect(`/registrations/${registration.id}?error=Payment%20details%20for%20this%20tournament%20are%20not%20available`);
    }

    return res.render('payments/manual-checkout', {
      title: 'Bank transfer payment instructions',
      registration,
      attempt,
      tournament,
      reference: attempt.providerReference,
      paymentAmount: registration.feeAmount,
      paymentCurrency: registration.feeCurrency,
      paymentReference: `${tournament.code}-${registration.id.slice(0, 8).toUpperCase()}`
    });
  } catch (error) {
    return next(error);
  }
}

async function reportBankTransfer(req, res, next) {
  try {
    const attempt = await prisma.paymentAttempt.findFirst({
      where: {
        id: req.body.attemptId,
        registrationId: req.params.registrationId,
        provider: 'BANK_TRANSFER',
        registration: { is: { userId: req.session.user.id } }
      },
      include: { registration: true }
    });
    if (!attempt) return res.status(404).render('404', { title: 'Payment attempt not found' });
    if (attempt.status === 'PROCESSING') return res.redirect(`/registrations/${attempt.registrationId}?payment=reported`);
    if (attempt.status !== 'PENDING') {
      return res.status(400).redirect(`/registrations/${attempt.registrationId}?error=${encodeURIComponent('This payment attempt is no longer active.')}`);
    }

    const transferReference = String(req.body.transferReference || '').trim().slice(0, 120);
    const reportedAt = new Date();
    await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'PROCESSING',
          providerPayload: {
            method: 'BANK_TRANSFER',
            playerReportedAt: reportedAt.toISOString(),
            transferReference: transferReference || null
          }
        }
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.session.user.id,
          action: 'BANK_TRANSFER_PAYMENT_REPORTED',
          entity: 'PaymentAttempt',
          entityId: attempt.id,
          metadata: { registrationId: attempt.registrationId, transferReference: transferReference || null }
        }
      })
    ]);
    return res.redirect(`/registrations/${attempt.registrationId}?payment=reported`);
  } catch (error) {
    return next(error);
  }
}

async function paymentReturn(req, res, next) {
  try {
    const reference = String(req.query.reference || '');
    const attempt = await prisma.paymentAttempt.findUnique({ where: { providerReference: reference }, include: { registration: true } });
    if (!attempt || attempt.registration.userId !== req.session.user.id) return res.status(404).render('404', { title: 'Payment not found' });
    return res.redirect(`/registrations/${attempt.registrationId}?payment=processing`);
  } catch (error) {
    return next(error);
  }
}

async function webhook(req, res) {
  const signature = req.get('x-payment-signature');
  const payload = req.rawBody || JSON.stringify(req.body);
  if (!verifyWebhookSignature(payload, signature)) return res.status(401).json({ error: 'Invalid payment signature' });
  if (!req.body?.providerReference || !req.body?.status) return res.status(400).json({ error: 'Invalid payment event' });
  const attempt = await prisma.paymentAttempt.findUnique({ where: { providerReference: req.body.providerReference }, include: { registration: true } });
  if (!attempt) return res.status(404).json({ error: 'Payment attempt not found' });
  if (['VERIFIED', 'SUCCESSFUL'].includes(attempt.status)) return res.status(200).json({ received: true });
  if (req.body.status === 'failed') {
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'FAILED', failureReason: 'Provider reported failure', providerPayload: req.body } });
    return res.status(200).json({ received: true });
  }
  if (!['successful', 'verified'].includes(req.body.status)) return res.status(200).json({ received: true });
  const providerPayment = await verifyPaymentWithProvider(attempt.providerReference);
  if (String(providerPayment.reference) !== attempt.providerReference ||
      String(providerPayment.amount) !== String(attempt.amount) ||
      providerPayment.currency !== attempt.currency ||
      !['successful', 'verified'].includes(String(providerPayment.status).toLowerCase())) {
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'FAILED', failureReason: 'Provider verification mismatch', providerPayload: providerPayment } });
    return res.status(400).json({ error: 'Payment verification mismatch' });
  }
  const registration = await confirmPaidRegistration({
    tournamentId: attempt.registration.tournamentId,
    userId: attempt.registration.userId,
    providerReference: attempt.providerReference,
    amount: String(providerPayment.amount),
    currency: providerPayment.currency
  });
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'VERIFIED', verifiedAt: new Date(), providerPayload: providerPayment } });
  const receipt = await prisma.receipt.findUnique({ where: { registrationId: registration.id } });
  if (receipt) await deliverReceipt(receipt.id);
  return res.status(200).json({ received: true });
}

module.exports = { checkout, reportBankTransfer, paymentReturn, webhook };
