async function submitResult(req, res) {
  res.status(501).json({ error: 'Match result workflow is not configured yet' });
}

module.exports = { submitResult };
