const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const env = require('../config/env');
const { prisma } = require('../config/database');
const { findUserByEmail, createUser } = require('../models/user.model');
const { createEmailVerificationToken, findEmailVerificationToken, createPasswordResetToken, findPasswordResetToken } = require('../models/auth.model');
const { sendTransactionalEmail } = require('../services/notification.service');

function tokenPair() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, tokenHash: crypto.createHash('sha256').update(raw).digest('hex') };
}

function setSession(req, user) {
  req.session.user = { id: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion, emailVerifiedAt: user.emailVerifiedAt };
}

async function showLogin(req, res) {
  return res.render('auth/login', { title: 'Sign in', error: null });
}

async function showRegister(req, res) {
  return res.render('auth/register', { title: 'Create account', error: null });
}

async function login(req, res, next) {
  try {
    const user = await findUserByEmail(req.body.email);
    if (!user || user.accountStatus !== 'ACTIVE' || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).render('auth/login', { title: 'Sign in', error: 'Invalid email or password' });
    }
    setSession(req, user);
    return res.redirect(user.emailVerifiedAt ? '/dashboard' : '/auth/verify-notice');
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await createUser({
      email: req.body.email,
      passwordHash,
      displayName: req.body.displayName,
      country: req.body.country
    });
    const token = tokenPair();
    await createEmailVerificationToken({
      tokenHash: token.tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await sendTransactionalEmail({
      to: user.email,
      subject: 'Verify your Champion Lounge account',
      text: `Verify your account: ${env.APP_URL}/auth/verify-email/${token.raw}`
    });
    return res.render('auth/verify-notice', { title: 'Verify your email', email: user.email });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).render('auth/register', { title: 'Create account', error: 'An account with that email already exists.' });
    return next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const token = await findEmailVerificationToken(tokenHash);
    if (!token || token.expiresAt < new Date()) return res.status(400).render('auth/verify-result', { title: 'Verification failed', success: false });
    await prisma.$transaction([
      prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerificationToken.delete({ where: { id: token.id } })
    ]);
    return res.render('auth/verify-result', { title: 'Email verified', success: true });
  } catch (error) {
    return next(error);
  }
}

async function showVerifyNotice(req, res) {
  return res.render('auth/verify-notice', { title: 'Verify your email', email: req.session.user?.email });
}

async function showForgotPassword(req, res) {
  return res.render('auth/forgot-password', { title: 'Reset password', message: null, error: null });
}

async function requestPasswordReset(req, res, next) {
  try {
    const user = await findUserByEmail(req.body.email);
    if (user) {
      const token = tokenPair();
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await createPasswordResetToken({ tokenHash: token.tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
      await sendTransactionalEmail({
        to: user.email,
        subject: 'Reset your Champion Lounge password',
        text: `Reset your password: ${env.APP_URL}/auth/reset-password/${token.raw}`
      });
    }
    return res.render('auth/forgot-password', { title: 'Reset password', message: 'If that email exists, a reset link has been sent.', error: null });
  } catch (error) {
    return next(error);
  }
}

async function showResetPassword(req, res) {
  return res.render('auth/reset-password', { title: 'Choose a new password', token: req.params.token, error: null });
}

async function resetPassword(req, res, next) {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const resetToken = await findPasswordResetToken(tokenHash);
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).render('auth/reset-password', { title: 'Choose a new password', token: req.params.token, error: 'This reset link is invalid or expired.' });
    }
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } })
    ]);
    if (req.session) req.session.destroy(() => {});
    return res.redirect('/auth/login?reset=complete');
  } catch (error) {
    return next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('championlounge.sid');
    return res.redirect('/');
  });
}

module.exports = { showLogin, showRegister, login, register, verifyEmail, showVerifyNotice, showForgotPassword, requestPasswordReset, showResetPassword, resetPassword, logout };
