function notFound(req, res) {
  res.status(404).render('404', { title: 'Not found' });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  if (req.accepts('html')) return res.status(500).render('500', { title: 'Server error' });
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
