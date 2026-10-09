async function dashboard(req, res) {
  res.render('dashboard', { title: 'Player dashboard' });
}

module.exports = { dashboard };
