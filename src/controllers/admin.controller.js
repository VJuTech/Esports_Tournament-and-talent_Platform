async function dashboard(req, res) {
  res.render('admin/dashboard', { title: 'Administration' });
}

module.exports = { dashboard };
