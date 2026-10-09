async function webhook(req, res) {
  res.status(501).json({ error: 'Payment provider adapter is not configured yet' });
}

module.exports = { webhook };
