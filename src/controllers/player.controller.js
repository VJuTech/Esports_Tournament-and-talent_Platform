async function dashboard(req, res, next) {
  try {
    return res.render('dashboard', { title: 'Player dashboard', profile: req.currentUserRecord });
  } catch (error) {
    return next(error);
  }
}

module.exports = { dashboard };
