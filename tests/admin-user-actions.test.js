const { prisma } = require('../src/config/database');
const controller = require('../src/controllers/operations.controller');

const findUser = vi.spyOn(prisma.user, 'findUnique');
const updateUser = vi.spyOn(prisma.user, 'update').mockResolvedValue({});
const createAuditLog = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
const transaction = vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

function response() {
  return {
    status: vi.fn(function setStatus() { return this; }),
    redirect: vi.fn()
  };
}

describe('super admin user account actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['suspend', 'ACTIVE', 'SUSPENDED', 'USER_SUSPENDED'],
    ['unsuspend', 'SUSPENDED', 'ACTIVE', 'USER_UNSUSPENDED'],
    ['delete', 'ACTIVE', 'DISABLED', 'USER_DELETED'],
    ['delete', 'SUSPENDED', 'DISABLED', 'USER_DELETED']
  ])('applies %s to a %s account and records the action', async (action, currentStatus, nextStatus, auditAction) => {
    findUser.mockResolvedValue({ id: 'target-user', accountStatus: currentStatus });
    const res = response();

    await controller.updateUserAccount({
      params: { id: 'target-user', action },
      session: { user: { id: 'admin-user' } }
    }, res, vi.fn());

    expect(updateUser).toHaveBeenCalledWith({
      where: { id: 'target-user' },
      data: { accountStatus: nextStatus, sessionVersion: { increment: 1 } }
    });
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: auditAction, entity: 'User', entityId: 'target-user' })
    }));
    expect(transaction).toHaveBeenCalledOnce();
    expect(res.redirect).toHaveBeenCalledWith('/admin/users?updated=true');
  });

  it('prevents a super admin from changing their own account', async () => {
    findUser.mockResolvedValue({ id: 'admin-user', accountStatus: 'ACTIVE' });
    const res = response();

    await controller.updateUserAccount({
      params: { id: 'admin-user', action: 'delete' },
      session: { user: { id: 'admin-user' } }
    }, res, vi.fn());

    expect(updateUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.redirect).toHaveBeenCalledWith('/admin/users?error=You%20cannot%20change%20your%20own%20account');
  });
});
