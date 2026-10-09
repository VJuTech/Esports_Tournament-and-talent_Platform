const env = require('./env');

function getPaymentProviderConfig() {
  if (!env.PAYMENT_PROVIDER_URL || !env.PAYMENT_PROVIDER_SECRET) {
    throw new Error('Payment provider is not configured');
  }

  return {
    url: env.PAYMENT_PROVIDER_URL,
    secret: env.PAYMENT_PROVIDER_SECRET
  };
}

module.exports = { getPaymentProviderConfig };
