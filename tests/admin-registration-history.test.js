const { prisma } = require('../src/config/database');
const controller = require('../src/controllers/operations.controller');

const findRegistrations = vi.spyOn(prisma.registration, 'findMany');

function response() {
  return { render: vi.fn() };
}

describe('admin registration history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows player, tournament, confirmed status, and verified payment status', async () => {
    findRegistrations.mockResolvedValue([{
      id: 'registration-1',
      status: 'CONFIRMED',
      tournamentNumber: 'OPEN-2026-0001',
      createdAt: new Date('2026-10-28T10:00:00Z'),
      user: { displayName: 'Player One' },
      tournament: { name: 'October Open' },
      payment: { status: 'VERIFIED' },
      paymentAttempts: []
    }]);
    const res = response();

    await controller.registrations({}, res, vi.fn());

    expect(res.render).toHaveBeenCalledWith('admin/records', expect.objectContaining({
      title: 'Registrations',
      columns: ['player', 'tournamentName', 'status', 'paymentStatus', 'tournamentNumber', 'createdAt'],
      records: [expect.objectContaining({
        player: 'Player One',
        tournamentName: 'October Open',
        status: 'CONFIRMED',
        paymentStatus: 'VERIFIED',
        tournamentNumber: 'OPEN-2026-0001'
      })]
    }));
  });

  it('shows the latest payment attempt while a transfer is awaiting verification', async () => {
    findRegistrations.mockResolvedValue([{
      id: 'registration-2',
      status: 'PENDING',
      tournamentNumber: null,
      createdAt: new Date(),
      user: { displayName: 'Player Two' },
      tournament: { name: 'October Open' },
      payment: null,
      paymentAttempts: [{ status: 'PROCESSING' }]
    }]);
    const res = response();

    await controller.registrations({}, res, vi.fn());

    const rendered = res.render.mock.calls[0][1];
    expect(rendered.records[0].paymentStatus).toBe('PROCESSING');
  });
});
