const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const database = require('../src/config/database');
const userModel = require('../src/models/user.model');
const authModel = require('../src/models/auth.model');

const findUserByEmail = vi.spyOn(userModel, 'findUserByEmail');
const createUserWithVerification = vi.spyOn(authModel, 'createUserWithVerification');
const updateUnverifiedUserCredentials = vi.spyOn(authModel, 'updateUnverifiedUserCredentials').mockResolvedValue(true);
const createEmailVerificationToken = vi.spyOn(authModel, 'createEmailVerificationToken').mockResolvedValue({});
const deleteVerificationTokens = vi.spyOn(database.prisma.emailVerificationToken, 'deleteMany').mockResolvedValue({ count: 1 });
const findEmailVerificationToken = vi.spyOn(authModel, 'findEmailVerificationToken');
const findPasswordResetToken = vi.spyOn(authModel, 'findPasswordResetToken');
const createPasswordResetToken = vi.spyOn(authModel, 'createPasswordResetToken').mockResolvedValue({});
const deletePasswordResetTokens = vi.spyOn(database.prisma.passwordResetToken, 'deleteMany').mockResolvedValue({ count: 1 });
const updatePasswordResetToken = vi.spyOn(database.prisma.passwordResetToken, 'update').mockResolvedValue({});
const updateUser = vi.spyOn(database.prisma.user, 'update').mockResolvedValue({});
const deleteVerificationToken = vi.spyOn(database.prisma.emailVerificationToken, 'delete').mockResolvedValue({});
const transaction = vi.spyOn(database.prisma, '$transaction').mockResolvedValue([]);
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const controller = require('../src/controllers/auth.controller');

function response() {
  return {
    status: vi.fn(function setStatus() { return this; }),
    render: vi.fn(),
    redirect: vi.fn()
  };
}

const input = {
  email: 'Player@Example.com',
  password: 'Password1!',
  displayName: 'Player One',
  country: 'Nigeria'
};

describe('registration recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a development verification code without a server error', async () => {
    findUserByEmail.mockResolvedValue(null);
    createUserWithVerification.mockResolvedValue({ id: 'user-1', email: 'player@example.com' });
    const res = response();
    const next = vi.fn();

    await controller.register({ body: input }, res, next);

    expect(createUserWithVerification).toHaveBeenCalledOnce();
    expect(updateUnverifiedUserCredentials).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith('auth/verify-notice', expect.objectContaining({
      email: 'player@example.com',
      verificationCode: expect.stringMatching(/^\d{6}$/),
      emailDeliveryWarning: null
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('never displays the verification code in production without email delivery', async () => {
    const originalNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    findUserByEmail.mockResolvedValue(null);
    createUserWithVerification.mockResolvedValue({ id: 'user-1', email: 'player@example.com' });
    const res = response();
    const next = vi.fn();

    await controller.register({ body: input }, res, next);
    env.NODE_ENV = originalNodeEnv;

    expect(res.render).toHaveBeenCalledWith('auth/verify-notice', expect.objectContaining({
      email: 'player@example.com',
      verificationCode: null,
      emailDeliveryWarning: expect.stringContaining('Email delivery is not configured')
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('updates the password on an existing unverified signup before issuing a replacement code', async () => {
    findUserByEmail.mockResolvedValue({ id: 'user-1', email: 'player@example.com', emailVerifiedAt: null });
    const res = response();
    const next = vi.fn();

    await controller.register({ body: input }, res, next);

    expect(createUserWithVerification).not.toHaveBeenCalled();
    expect(updateUnverifiedUserCredentials).toHaveBeenCalledOnce();
    const [userId, passwordHash, tokenData] = updateUnverifiedUserCredentials.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(await bcrypt.compare(input.password, passwordHash)).toBe(true);
    expect(tokenData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenData.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(res.render).toHaveBeenCalledWith('auth/verify-notice', expect.objectContaining({
      email: 'player@example.com'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows the retried signup password to sign in after email verification', async () => {
    findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'player@example.com',
      passwordHash: await bcrypt.hash(input.password, 4),
      accountStatus: 'ACTIVE',
      sessionVersion: 0,
      emailVerifiedAt: new Date()
    });
    const req = { body: { email: input.email, password: input.password }, session: {} };
    const res = response();

    await controller.login(req, res, vi.fn());

    expect(req.session.user.id).toBe('user-1');
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('recovers from a concurrent duplicate insert instead of returning 500', async () => {
    const duplicateError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-1', email: 'player@example.com', emailVerifiedAt: null });
    createUserWithVerification.mockRejectedValueOnce(duplicateError);
    const res = response();
    const next = vi.fn();

    await controller.register({ body: input }, res, next);

    expect(updateUnverifiedUserCredentials).toHaveBeenCalledOnce();
    expect(res.render).toHaveBeenCalledWith('auth/verify-notice', expect.objectContaining({
      email: 'player@example.com'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('verifies the matching user and consumes a valid, unexpired code', async () => {
    findUserByEmail.mockResolvedValue({ id: 'user-1', email: 'player@example.com' });
    findEmailVerificationToken.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000)
    });
    const res = response();
    const next = vi.fn();
    const code = '482915';

    await controller.verifyEmailCode({ body: { email: input.email, code } }, res, next);

    expect(findEmailVerificationToken).toHaveBeenCalledWith(crypto.createHmac('sha256', env.SESSION_SECRET).update(code).digest('hex'));
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { emailVerifiedAt: expect.any(Date) }
    });
    expect(deleteVerificationToken).toHaveBeenCalledWith({ where: { id: 'token-1' } });
    expect(transaction).toHaveBeenCalledOnce();
    expect(res.render).toHaveBeenCalledWith('auth/verify-result', { title: 'Email verified', success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired verification codes without changing the user', async () => {
    findUserByEmail.mockResolvedValue({ id: 'user-1', email: 'player@example.com' });
    findEmailVerificationToken.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 60_000)
    });
    const res = response();
    const next = vi.fn();

    await controller.verifyEmailCode({ body: { email: input.email, code: '482915' } }, res, next);

    expect(transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('generates a development password reset code without calling an email provider', async () => {
    findUserByEmail.mockResolvedValue({ id: 'user-1', email: 'player@example.com' });
    const res = response();

    await controller.requestPasswordReset({ body: { email: input.email } }, res, vi.fn());

    expect(deletePasswordResetTokens).toHaveBeenCalledWith({ where: { userId: 'user-1', usedAt: null } });
    expect(createPasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: expect.any(Date)
    }));
    expect(res.render).toHaveBeenCalledWith('auth/forgot-password', expect.objectContaining({
      email: 'player@example.com',
      resetCode: expect.stringMatching(/^\d{6}$/)
    }));
  });

  it('updates the password only when the reset code matches and is unused', async () => {
    const email = 'player@example.com';
    const code = '573104';
    findUserByEmail.mockResolvedValue({ id: 'user-1', email });
    findPasswordResetToken.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000)
    });
    const res = response();
    const next = vi.fn();

    await controller.resetPasswordWithCode({
      body: { email, code, password: 'NewPassword2!', passwordConfirmation: 'NewPassword2!' }
    }, res, next);

    expect(findPasswordResetToken).toHaveBeenCalledWith(crypto.createHmac('sha256', env.SESSION_SECRET).update(code).digest('hex'));
    const [updateArgs] = updateUser.mock.calls[0];
    expect(await bcrypt.compare('NewPassword2!', updateArgs.data.passwordHash)).toBe(true);
    expect(updateArgs.data.sessionVersion).toEqual({ increment: 1 });
    expect(updatePasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'reset-1' } }));
    expect(transaction).toHaveBeenCalledOnce();
    expect(res.redirect).toHaveBeenCalledWith('/auth/login?reset=complete');
    expect(next).not.toHaveBeenCalled();
  });
});
