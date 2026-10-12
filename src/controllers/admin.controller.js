async function dashboard(req, res, next) {
  try {
    return res.render('admin/dashboard', { title: 'Administration' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { dashboard };
