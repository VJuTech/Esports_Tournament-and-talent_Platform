const { verifyWebhookSignature } = require('../services/payment.service');
const { confirmPaidRegistration } = require('../services/registration.service');
const { prisma } = require('../config/database');

async function webhook(req, res) {
  const signature = req.get('x-payment-signature');
  const payload = JSON.stringify(req.body);
  if (!verifyWebhookSignature(payload, signature)) return res.status(401).json({ error: 'Invalid payment signature' });
  if (!req.body?.providerReference || !req.body?.status) return res.status(400).json({ error: 'Invalid payment event' });
  const payment = await prisma.payment.findUnique({ where: { providerReference: req.body.providerReference }, include: { registration: true } });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (req.body.status === 'failed') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    return res.status(200).json({ received: true });
  }
  if (!['successful', 'verified'].includes(req.body.status) || !payment.registration) return res.status(200).json({ received: true });
  await confirmPaidRegistration({
    tournamentId: payment.registration.tournamentId,
    userId: payment.registration.userId,
    paymentId: payment.id,
    amount: String(req.body.amount)
  });
  return res.status(200).json({ received: true });
}

module.exports = { webhook };
