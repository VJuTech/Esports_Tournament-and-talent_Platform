const crypto = require('node:crypto');
const { getPaymentProviderConfig } = require('../config/payment');

function verifyWebhookSignature(payload, signature) {
  const { secret } = getPaymentProviderConfig();
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function verifyPaymentWithProvider(providerReference) {
  const config = getPaymentProviderConfig();
  const response = await fetch(`${config.url}/payments/${encodeURIComponent(providerReference)}`, {
    headers: { Authorization: `Bearer ${config.secret}` }
  });
  if (!response.ok) throw new Error(`Payment provider verification failed with status ${response.status}`);
  return response.json();
}

module.exports = { verifyWebhookSignature, verifyPaymentWithProvider };
