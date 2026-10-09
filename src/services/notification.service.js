const env = require('../config/env');

async function sendTransactionalEmail({ to, subject, text }) {
  if (!to || !subject || !text) throw new Error('Email recipient, subject, and text are required');
  if (!env.EMAIL_PROVIDER_URL || !env.EMAIL_PROVIDER_SECRET) {
    throw new Error('Email provider is not configured');
  }
  const response = await fetch(env.EMAIL_PROVIDER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.EMAIL_PROVIDER_SECRET}` },
    body: JSON.stringify({ to, subject, text })
  });
  if (!response.ok) throw new Error(`Email provider rejected request with status ${response.status}`);
  return response.json();
}

module.exports = { sendTransactionalEmail };
