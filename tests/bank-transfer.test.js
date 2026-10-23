const { tournamentData } = require('../src/controllers/management.controller');

describe('bank transfer tournament setup', () => {
  it('leaves database-managed bank details out of the tournament payload', () => {
    const data = tournamentData({
      code: 'abc',
      name: 'Tournament',
      entryFee: '2500',
      currency: 'NGN',
      capacity: '16',
      format: 'SINGLE_ELIMINATION',
      participationType: 'INDIVIDUAL',
      registrationOpensAt: '2026-01-01T00:00:00.000Z',
      registrationDeadline: '2026-01-10T00:00:00.000Z',
      startsAt: '2026-01-15T00:00:00.000Z',
      endsAt: '2026-01-18T00:00:00.000Z',
      gameId: 'game-123',
      paymentBankName: 'First Bank',
      paymentAccountName: 'Champion Lounge Ltd',
      paymentAccountNumber: '1234567890',
      paymentAccountType: 'CURRENT'
    }, 'user-123');

    expect(data).not.toHaveProperty('paymentBankName');
    expect(data).not.toHaveProperty('paymentAccountName');
    expect(data).not.toHaveProperty('paymentAccountNumber');
    expect(data).not.toHaveProperty('paymentAccountType');
    expect(data).not.toHaveProperty('paymentInstructions');
  });
});
