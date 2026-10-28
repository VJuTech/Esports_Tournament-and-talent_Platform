const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const env = require('../config/env');
const { prisma } = require('../config/database');
const { findUserByEmail } = require('../models/user.model');
const { createUserWithVerification, updateUnverifiedUserCredentials, createEmailVerificationToken, findEmailVerificationToken, createPasswordResetToken, findPasswordResetToken } = require('../models/auth.model');

function tokenPair() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, tokenHash: crypto.createHash('sha256').update(raw).digest('hex') };
}

function verificationCodePair() {
  const raw = crypto.randomInt(100000, 1000000).toString();
  return { raw, tokenHash: crypto.createHmac('sha256', env.SESSION_SECRET).update(raw).digest('hex') };
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

async function issueVerificationForUser(user) {
  const code = verificationCodePair();
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await createEmailVerificationToken({
    tokenHash: code.tokenHash,
    userId: user.id,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  });
  const developmentCode = env.NODE_ENV !== 'production' ? code.raw : null;
  return {
    verificationCode: developmentCode,
    emailDeliveryWarning: developmentCode
      ? null
      : 'Email delivery is not configured. Contact support to complete verification.'
  };
}

async function refreshUnverifiedSignup(user, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const code = verificationCodePair();
  const updated = await updateUnverifiedUserCredentials(user.id, passwordHash, {
    tokenHash: code.tokenHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  });
  if (!updated) return null;
  return {
    verificationCode: env.NODE_ENV !== 'production' ? code.raw : null,
    emailDeliveryWarning: env.NODE_ENV !== 'production'
      ? null
      : 'Email delivery is not configured. Contact support to complete verification.'
  };
}

function renderVerificationNotice(res, data = {}) {
  return res.render('auth/verify-notice', {
    title: 'Verify your email',
    email: '',
    error: null,
    notice: null,
    verificationCode: null,
    emailDeliveryWarning: null,
    ...data
  });
}

async function register(req, res, next) {
  const email = req.body.email.trim().toLowerCase();
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      if (existing.emailVerifiedAt) {
        return res.status(409).render('auth/register', {
          title: 'Create account',
          error: 'An account with that email already exists. Sign in instead.'
        });
      }
      const verification = await refreshUnverifiedSignup(existing, req.body.password);
      if (!verification) {
        const latest = await findUserByEmail(email);
        if (latest?.emailVerifiedAt) {
          return res.status(409).render('auth/register', {
            title: 'Create account',
            error: 'An account with that email already exists. Sign in instead.'
          });
        }
        return next(new Error('Could not update the pending account. Please try again.'));
      }
      return renderVerificationNotice(res, {
        email: existing.email,
        ...verification
      });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const code = verificationCodePair();
    const user = await createUserWithVerification({
      email,
      passwordHash,
      displayName: req.body.displayName,
      country: req.body.country
    }, {
      tokenHash: code.tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
    return renderVerificationNotice(res, {
      email: user.email,
      verificationCode: env.NODE_ENV !== 'production' ? code.raw : null,
      emailDeliveryWarning: env.NODE_ENV !== 'production'
        ? null
        : 'Email delivery is not configured. Contact support to complete verification.'
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await findUserByEmail(email);
      if (existing?.emailVerifiedAt) {
        return res.status(409).render('auth/register', {
          title: 'Create account',
          error: 'An account with that email already exists. Sign in instead.'
        });
      }
      if (existing) {
        const verification = await refreshUnverifiedSignup(existing, req.body.password);
        if (!verification) {
          const latest = await findUserByEmail(email);
          if (latest?.emailVerifiedAt) {
            return res.status(409).render('auth/register', {
              title: 'Create account',
              error: 'An account with that email already exists. Sign in instead.'
            });
          }
          return next(new Error('Could not update the pending account. Please try again.'));
        }
        return renderVerificationNotice(res, {
          email: existing.email,
          ...verification
        });
      }
    }
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

async function verifyEmailCode(req, res, next) {
  const email = req.body.email.trim().toLowerCase();
  const codeHash = crypto.createHmac('sha256', env.SESSION_SECRET).update(req.body.code.trim()).digest('hex');
  try {
    const user = await findUserByEmail(email);
    const token = await findEmailVerificationToken(codeHash);
    if (!user || !token || token.userId !== user.id || token.expiresAt <= new Date()) {
      return renderVerificationNotice(res.status(400), {
        email,
        error: 'That verification code is invalid or expired.',
      });
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
      prisma.emailVerificationToken.delete({ where: { id: token.id } })
    ]);
    return res.render('auth/verify-result', { title: 'Email verified', success: true });
  } catch (error) {
    return next(error);
  }
}

async function showVerifyNotice(req, res) {
  if (!req.session.user?.email) return renderVerificationNotice(res);
  try {
    const user = await findUserByEmail(req.session.user.email);
    if (!user || user.emailVerifiedAt) return res.redirect('/auth/login');
    return renderVerificationNotice(res, {
      email: user.email,
      ...(await issueVerificationForUser(user))
    });
  } catch (error) {
    return res.status(503).render('500', { title: 'Verification unavailable' });
  }
}

async function resendVerification(req, res, next) {
  const email = req.body.email.trim().toLowerCase();
  try {
    const user = await findUserByEmail(email);
    if (user && !user.emailVerifiedAt) {
      const verification = await issueVerificationForUser(user);
      return renderVerificationNotice(res, {
        email,
        ...verification
      });
    }
    return renderVerificationNotice(res, {
      email,
      notice: 'If this address has an unverified account, verification instructions are available.'
    });
  } catch (error) {
    return next(error);
  }
}

async function showForgotPassword(req, res) {
  return res.render('auth/forgot-password', { title: 'Reset password', message: null, error: null });
}

async function requestPasswordReset(req, res, next) {
  try {
    const email = req.body.email.trim().toLowerCase();
    const user = await findUserByEmail(email);
    let resetCode = null;
    if (user) {
      const code = verificationCodePair();
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await createPasswordResetToken({
        tokenHash: code.tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });
      if (env.NODE_ENV !== 'production') resetCode = code.raw;
    }
    return res.render('auth/forgot-password', {
      title: 'Reset password',
      message: resetCode
        ? 'Use this one-time code to choose a new password.'
        : 'If that account exists, reset instructions are available when email delivery is configured.',
      error: null,
      email,
      resetCode,
      emailDeliveryWarning: env.NODE_ENV === 'production' ? 'Email delivery is not configured. Contact support for account recovery.' : null
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPasswordWithCode(req, res, next) {
  const email = req.body.email.trim().toLowerCase();
  const codeHash = crypto.createHmac('sha256', env.SESSION_SECRET).update(req.body.code.trim()).digest('hex');
  try {
    const user = await findUserByEmail(email);
    const resetToken = await findPasswordResetToken(codeHash);
    if (!user || !resetToken || resetToken.userId !== user.id || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return res.status(400).render('auth/forgot-password', {
        title: 'Reset password',
        message: null,
        error: 'That reset code is invalid or expired.',
        email,
        resetCode: null,
        emailDeliveryWarning: null
      });
    }
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } })
    ]);
    return res.redirect('/auth/login?reset=complete');
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
  const clearSessionCookie = () => {
    res.clearCookie('championlounge.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production'
    });
    return res.redirect('/');
  };

  if (!req.session) return clearSessionCookie();
  req.session.destroy((error) => {
    if (error) return next(error);
    return clearSessionCookie();
  });
}

module.exports = { showLogin, showRegister, login, register, verifyEmail, verifyEmailCode, showVerifyNotice, resendVerification, showForgotPassword, requestPasswordReset, resetPasswordWithCode, showResetPassword, resetPassword, logout };
