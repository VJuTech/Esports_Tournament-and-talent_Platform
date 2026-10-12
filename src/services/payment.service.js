const crypto = require('node:crypto');
const { getPaymentProviderConfig } = require('../config/payment');

function verifyWebhookSignature(payload, signature) {
  const { secret } = getPaymentProviderConfig();
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function createProviderReference() {
  return `CL-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

async function providerRequest(path, options = {}) {
  const config = getPaymentProviderConfig();
  const response = await fetch(`${config.url.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Payment provider request failed with status ${response.status}`);
  return response.json();
}

function initiatePayment({ reference, amount, currency, email, callbackUrl }) {
  return providerRequest('/payments', {
    method: 'POST',
    body: JSON.stringify({ reference, amount, currency, email, callbackUrl })
  });
}

function verifyPaymentWithProvider(providerReference) {
  return providerRequest(`/payments/${encodeURIComponent(providerReference)}`);
}

module.exports = { verifyWebhookSignature, createProviderReference, initiatePayment, verifyPaymentWithProvider, providerRequest };
