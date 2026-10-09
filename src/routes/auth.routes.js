const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { loginSchema, registrationSchema, resetRequestSchema, resetPasswordSchema } = require('../validators/auth.validator');

const router = express.Router();
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
router.get('/login', controller.showLogin);
router.get('/register', controller.showRegister);
router.post('/login', authRateLimit, validate(loginSchema), controller.login);
router.post('/register', validate(registrationSchema), controller.register);
router.get('/verify-notice', controller.showVerifyNotice);
router.get('/verify-email/:token', controller.verifyEmail);
router.get('/forgot-password', controller.showForgotPassword);
router.post('/forgot-password', authRateLimit, validate(resetRequestSchema), controller.requestPasswordReset);
router.get('/reset-password/:token', controller.showResetPassword);
router.post('/reset-password/:token', authRateLimit, validate(resetPasswordSchema), controller.resetPassword);
router.post('/logout', controller.logout);

module.exports = router;
