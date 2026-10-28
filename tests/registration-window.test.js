const { prisma } = require('../src/config/database');
const controller = require('../src/controllers/registration.controller');

const findTournament = vi.spyOn(prisma.tournament, 'findUnique');
const findGameProfile = vi.spyOn(prisma.gameProfile, 'findUnique');
const findExistingRegistration = vi.spyOn(prisma.registration, 'findUnique');
const countRegistrations = vi.spyOn(prisma.registration, 'count');
const createRegistration = vi.spyOn(prisma.registration, 'create');
const transaction = vi.spyOn(prisma, '$transaction');

function response() {
  return {
    status: vi.fn(function setStatus() { return this; }),
    redirect: vi.fn()
  };
}

function request() {
  return {
    body: { tournamentId: 'tournament-1' },
    session: { user: { id: 'player-1' } }
  };
}

function tournament({ opensAt, deadline }) {
  return {
    id: 'tournament-1',
    status: 'PUBLISHED',
    registrationOpensAt: opensAt,
    registrationDeadline: deadline,
    gameId: 'game-1',
    participationType: 'INDIVIDUAL',
    capacity: 16,
    entryFee: 100,
    currency: 'NGN'
  };
}

describe('tournament registration window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows registration when the opening date has passed and deadline is still ahead', async () => {
    const now = Date.now();
    findTournament.mockResolvedValue(tournament({
      opensAt: new Date(now - 60_000),
      deadline: new Date(now + 60_000)
    }));
    findGameProfile.mockResolvedValue({ userId: 'player-1', gameId: 'game-1' });
    findExistingRegistration.mockResolvedValue(null);
    countRegistrations.mockResolvedValue(0);
    createRegistration.mockResolvedValue({ id: 'registration-1' });
    transaction.mockImplementation(async (callback) => callback({
      registration: {
        findUnique: findExistingRegistration,
        count: countRegistrations,
        create: createRegistration
      }
    }));
    const res = response();

    await controller.create(request(), res, vi.fn());

    expect(createRegistration).toHaveBeenCalledOnce();
    expect(res.redirect).toHaveBeenCalledWith('/registrations/registration-1');
  });

  it('explains that registration has not opened yet', async () => {
    findTournament.mockResolvedValue(tournament({
      opensAt: new Date(Date.now() + 60_000),
      deadline: new Date(Date.now() + 120_000)
    }));
    const res = response();

    await controller.create(request(), res, vi.fn());

    expect(findGameProfile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(decodeURIComponent(res.redirect.mock.calls[0][0])).toContain('Registration opens on');
  });

  it('reports the deadline after registration has expired', async () => {
    findTournament.mockResolvedValue(tournament({
      opensAt: new Date(Date.now() - 120_000),
      deadline: new Date(Date.now() - 60_000)
    }));
    const res = response();

    await controller.create(request(), res, vi.fn());

    expect(findGameProfile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(decodeURIComponent(res.redirect.mock.calls[0][0])).toContain('Registration closed on');
  });
});
