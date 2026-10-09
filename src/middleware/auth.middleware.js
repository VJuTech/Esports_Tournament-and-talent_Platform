const { findUserById } = require('../models/user.model');

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).redirect('/auth/login');
  return findUserById(req.session.user.id).then((user) => {
    if (!user || user.accountStatus !== 'ACTIVE' || user.sessionVersion !== req.session.user.sessionVersion) {
      return req.session.destroy(() => res.redirect('/auth/login'));
    }
    req.currentUserRecord = user;
    return next();
  }).catch(next);
}

function requireVerified(req, res, next) {
  return requireAuth(req, res, () => {
    if (!req.currentUserRecord.emailVerifiedAt) return res.redirect('/auth/verify-notice');
    return next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => requireVerified(req, res, () => {
    if (!roles.includes(req.session.user.role)) return res.status(403).render('403', { title: 'Forbidden' });
    return next();
  });
}

module.exports = { requireAuth, requireVerified, requireRole };
