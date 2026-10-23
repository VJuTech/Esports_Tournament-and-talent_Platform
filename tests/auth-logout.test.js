const { logout } = require('../src/controllers/auth.controller');

describe('logout', () => {
  it('destroys the session, clears its cookie, and redirects home', () => {
    const req = { session: { destroy: vi.fn((callback) => callback(null)) } };
    const res = { clearCookie: vi.fn(), redirect: vi.fn() };
    const next = vi.fn();

    logout(req, res, next);

    expect(req.session.destroy).toHaveBeenCalledOnce();
    expect(res.clearCookie).toHaveBeenCalledWith('championlounge.sid', expect.objectContaining({
      path: '/',
      httpOnly: true,
      sameSite: 'lax'
    }));
    expect(res.redirect).toHaveBeenCalledWith('/');
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards session-store errors instead of reporting a successful logout', () => {
    const error = new Error('Session store unavailable');
    const req = { session: { destroy: vi.fn((callback) => callback(error)) } };
    const res = { clearCookie: vi.fn(), redirect: vi.fn() };
    const next = vi.fn();

    logout(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});