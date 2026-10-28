const { prisma } = require('../src/config/database');
const controller = require('../src/controllers/payment.controller');

const findRegistration = vi.spyOn(prisma.registration, 'findFirst');
const findPaymentAttempt = vi.spyOn(prisma.paymentAttempt, 'findFirst');
const createPaymentAttempt = vi.spyOn(prisma.paymentAttempt, 'create');
const updatePaymentAttempt = vi.spyOn(prisma.paymentAttempt, 'update');
const createAuditLog = vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
const transaction = vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

function response() {
  return {
    status: vi.fn(function setStatus() { return this; }),
    redirect: vi.fn(),
    render: vi.fn()
  };
}

function registration(paymentDetails = {}) {
  return {
    id: 'registration-1',
    userId: 'player-1',
    status: 'PENDING',
    feeAmount: 2500,
    feeCurrency: 'NGN',
    tournament: {
      id: 'tournament-1',
      code: 'OPEN-2026',
      registrationDeadline: new Date(Date.now() + 60_000),
      paymentBankName: 'Palmpay',
      paymentAccountName: 'VJU TECH LIMITED.',
      paymentAccountNumber: '8943931330',
      paymentAccountType: 'CURRENT',
      paymentInstructions: 'Use the registration code as transfer narration.',
      ...paymentDetails
    },
    user: { email: 'player@example.com' }
  };
}

describe('bank transfer checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRegistration.mockResolvedValue(registration());
    findPaymentAttempt.mockResolvedValue(null);
    createPaymentAttempt.mockResolvedValue({ id: 'attempt-1' });
    updatePaymentAttempt.mockResolvedValue({});
  });

  it('renders the stored bank account and instructions on checkout', async () => {
    const res = response();
    const next = vi.fn();

    await controller.checkout({
      params: { registrationId: 'registration-1' },
      session: { user: { id: 'player-1' } }
    }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.render).toHaveBeenCalledWith('payments/manual-checkout', expect.objectContaining({
      tournament: expect.objectContaining({
        paymentBankName: 'Palmpay',
        paymentAccountName: 'VJU TECH LIMITED.',
        paymentAccountNumber: '8943931330',
        paymentAccountType: 'CURRENT',
        paymentInstructions: 'Use the registration code as transfer narration.'
      }),
      paymentAmount: 2500,
      paymentCurrency: 'NGN'
    }));
  });

  it('shows a clear setup error if any required bank field is missing', async () => {
    findRegistration.mockResolvedValue(registration({ paymentAccountNumber: null }));
    const res = response();

    await controller.checkout({
      params: { registrationId: 'registration-1' },
      session: { user: { id: 'player-1' } }
    }, res, vi.fn());

    expect(updatePaymentAttempt).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-1' },
      data: expect.objectContaining({ status: 'FAILED' })
    }));
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('Payment%20details%20for%20this%20tournament%20are%20not%20available'));
  });

  it('records the player claim for finance review without confirming payment', async () => {
    findPaymentAttempt.mockResolvedValue({
      id: 'attempt-1',
      registrationId: 'registration-1',
      provider: 'BANK_TRANSFER',
      providerReference: 'CL-REF',
      status: 'PENDING'
    });
    const res = response();
    const next = vi.fn();

    await controller.reportBankTransfer({
      params: { registrationId: 'registration-1' },
      body: { attemptId: 'attempt-1', transferReference: 'BANK-TRACE-123' },
      session: { user: { id: 'player-1' } }
    }, res, next);

    expect(updatePaymentAttempt).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-1' },
      data: expect.objectContaining({
        status: 'PROCESSING',
        providerPayload: expect.objectContaining({ transferReference: 'BANK-TRACE-123' })
      })
    }));
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'BANK_TRANSFER_PAYMENT_REPORTED' })
    }));
    expect(transaction).toHaveBeenCalledOnce();
    expect(res.redirect).toHaveBeenCalledWith('/registrations/registration-1?payment=reported');
    expect(next).not.toHaveBeenCalled();
  });
});
