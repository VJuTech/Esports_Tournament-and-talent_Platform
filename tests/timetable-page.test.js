const { prisma } = require('../src/config/database');
const controller = require('../src/controllers/physical-tournament.controller');

const findTournament = vi.spyOn(prisma.tournament, 'findUnique');

function response() {
  return {
    status: vi.fn(function setStatus() { return this; }),
    render: vi.fn()
  };
}

describe('public tournament timetable page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an unpublished state for a public tournament instead of a 404', async () => {
    const tournament = {
      id: 'tournament-1',
      name: 'Open Tournament',
      status: 'PUBLISHED',
      game: { name: 'Snooker' },
      timetable: null,
      matches: []
    };
    findTournament.mockResolvedValue(tournament);
    const res = response();
    const next = vi.fn();

    await controller.publicTimetable({ params: { id: tournament.id } }, res, next);

    expect(res.render).toHaveBeenCalledWith('tournaments/timetable', {
      title: 'Open Tournament timetable',
      tournament,
      timetablePublished: false
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps draft tournament timetables private', async () => {
    findTournament.mockResolvedValue({ id: 'tournament-1', status: 'DRAFT' });
    const res = response();

    await controller.publicTimetable({ params: { id: 'tournament-1' } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('404', { title: 'Tournament not found' });
  });
});
