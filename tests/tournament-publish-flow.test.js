const database = require('../src/config/database');
const gameModel = require('../src/models/game.model');
const tournamentModel = require('../src/models/tournament.model');
const imageService = require('../src/services/image.service');
const mocks = {
  auditCreate: vi.spyOn(database.prisma.auditLog, 'create').mockResolvedValue({}),
  createTournament: vi.spyOn(tournamentModel, 'createTournament'),
  findTournamentById: vi.spyOn(tournamentModel, 'findTournamentById'),
  listGames: vi.spyOn(gameModel, 'listGames').mockResolvedValue([]),
  storeImage: vi.spyOn(imageService, 'storeImage'),
  updateTournament: vi.spyOn(tournamentModel, 'updateTournament')
};

const controller = require('../src/controllers/management.controller');

function response() {
  return {
    redirect: vi.fn(),
    render: vi.fn(),
    status: vi.fn(function setStatus() { return this; })
  };
}

describe('tournament draft and publish flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves the completed form as a draft and opens its editor', async () => {
    mocks.storeImage.mockResolvedValue('/media/image-1');
    mocks.createTournament.mockResolvedValue({ id: 'tournament-1' });
    const res = response();

    await controller.create({
      body: {
        code: 'open-2026',
        name: 'Open Tournament',
        format: 'SINGLE_ELIMINATION',
        participationType: 'INDIVIDUAL',
        entryFee: '2500',
        currency: 'NGN',
        registrationOpensAt: '2026-01-01T00:00',
        registrationDeadline: '2026-01-10T00:00',
        startsAt: '2026-01-15T00:00',
        endsAt: '2026-01-18T00:00',
        capacity: '16',
        gameId: 'game-1',
        paymentBankName: 'Form bank value'
      },
      file: { originalname: 'poster.png' },
      session: { user: { id: 'manager-1' } }
    }, res, vi.fn());

    expect(mocks.createTournament).toHaveBeenCalledWith(expect.not.objectContaining({ paymentBankName: 'Form bank value' }));
    expect(res.redirect).toHaveBeenCalledWith('/admin/tournaments/tournament-1/edit?saved=draft');
  });

  it('publishes a ready draft and redirects to its public tournament page', async () => {
    mocks.findTournamentById.mockResolvedValue({
      id: 'tournament-1',
      status: 'DRAFT',
      code: 'OPEN-2026',
      name: 'Open Tournament',
      imageUrl: '/media/image-1',
      format: 'SINGLE_ELIMINATION',
      gameId: 'game-1',
      currency: 'NGN',
      terms: 'Tournament terms',
      prizeInformation: 'Winner prize',
      registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
      registrationDeadline: new Date('2026-01-10T00:00:00Z'),
      startsAt: new Date('2026-01-15T00:00:00Z'),
      endsAt: new Date('2026-01-18T00:00:00Z'),
      capacity: 16,
      entryFee: 2500,
      paymentBankName: 'Palmpay',
      paymentAccountName: 'VJU TECH LIMITED.',
      paymentAccountNumber: '8943931330',
      paymentAccountType: 'CURRENT'
    });
    mocks.updateTournament.mockResolvedValue({});
    const res = response();

    await controller.transition({
      params: { id: 'tournament-1' },
      body: { status: 'PUBLISHED' },
      session: { user: { id: 'manager-1' } }
    }, res, vi.fn());

    expect(mocks.updateTournament).toHaveBeenCalledWith('tournament-1', expect.objectContaining({ status: 'PUBLISHED' }));
    expect(res.redirect).toHaveBeenCalledWith('/tournaments/tournament-1');
  });

  it('keeps a paid draft private when bank details are missing', async () => {
    mocks.findTournamentById.mockResolvedValue({
      id: 'tournament-1',
      status: 'DRAFT',
      code: 'OPEN-2026',
      name: 'Open Tournament',
      imageUrl: '/media/image-1',
      format: 'SINGLE_ELIMINATION',
      gameId: 'game-1',
      currency: 'NGN',
      terms: 'Tournament terms',
      prizeInformation: 'Winner prize',
      registrationOpensAt: new Date('2026-01-01T00:00:00Z'),
      registrationDeadline: new Date('2026-01-10T00:00:00Z'),
      startsAt: new Date('2026-01-15T00:00:00Z'),
      endsAt: new Date('2026-01-18T00:00:00Z'),
      capacity: 16,
      entryFee: 2500,
      paymentBankName: null,
      paymentAccountName: null,
      paymentAccountNumber: null,
      paymentAccountType: null
    });
    const res = response();

    await controller.transition({
      params: { id: 'tournament-1' },
      body: { status: 'PUBLISHED' },
      session: { user: { id: 'manager-1' } }
    }, res, vi.fn());

    expect(mocks.updateTournament).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('admin/tournaments/form', expect.objectContaining({
      error: expect.stringContaining('Bank transfer details are not configured')
    }));
  });
});