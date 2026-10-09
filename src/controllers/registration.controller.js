async function create(req, res) {
  res.status(501).json({ error: 'Registration payment flow is not configured yet' });
}

module.exports = { create };
