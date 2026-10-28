const { prisma } = require('../src/config/database');
const registrationService = require('../src/services/registration.service');
const receiptService = require('../src/services/receipt.service');

const findAttempt = vi.spyOn(prisma.paymentAttempt, 'findUnique');
const updateAttempt = vi.spyOn(prisma.paymentAttempt, 'update').mockResolvedValue({});
const createAuditLog = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
const findReceipt = vi.spyOn(prisma.receipt, 'findUnique');
const transaction = vi.spyOn(prisma, '$transaction').mockImplementation(async (operations) => Promise.all(operations));
const confirmPaidRegistration = vi.spyOn(registrationService, 'confirmPaidRegistration');
const deliverReceipt = vi.spyOn(receiptService, 'deliverReceipt').mockResolvedValue({});
const controller = require('../src/controllers/finance.controller');

function response() {
  return {
    status: vi.fn(function setStatus() { return this; }),
    redirect: vi.fn()
  };
}

describe('finance bank transfer verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms the registration only after finance verifies a reported transfer', async () => {
    findAttempt.mockResolvedValue({
      id: 'attempt-1',
      provider: 'BANK_TRANSFER',
      providerReference: 'CL-REF',
      status: 'PROCESSING',
      amount: { toString: () => '2500' },
      currency: 'NGN',
      registrationId: 'registration-1',
      registration: { tournamentId: 'tournament-1', userId: 'player-1' }
    });
    confirmPaidRegistration.mockResolvedValue({ id: 'registration-1' });
    findReceipt.mockResolvedValue({ id: 'receipt-1' });
    const res = response();
    const next = vi.fn();

    await controller.verifyBankTransfer({
      params: { id: 'attempt-1' },
      session: { user: { id: 'finance-1' } }
    }, res, next);

    expect(confirmPaidRegistration).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      userId: 'player-1',
      providerReference: 'CL-REF',
      amount: '2500',
      currency: 'NGN'
    });
    expect(updateAttempt).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-1' },
      data: expect.objectContaining({ status: 'VERIFIED', verifiedAt: expect.any(Date) })
    }));
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'BANK_TRANSFER_PAYMENT_VERIFIED' })
    }));
    expect(deliverReceipt).toHaveBeenCalledWith('receipt-1');
    expect(res.redirect).toHaveBeenCalledWith('/admin/payments?verified=true');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects attempts that are not awaiting finance review', async () => {
    findAttempt.mockResolvedValue({ id: 'attempt-1', provider: 'BANK_TRANSFER', status: 'PENDING' });
    const res = response();

    await controller.verifyBankTransfer({ params: { id: 'attempt-1' }, session: { user: { id: 'finance-1' } } }, res, vi.fn());

    expect(confirmPaidRegistration).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.redirect).toHaveBeenCalledWith('/admin/payments?error=Transfer%20is%20not%20awaiting%20verification');
  });
});
