const { prisma } = require('../config/database');

function bracketSizeFor(count) {
  let size = 2;
  while (size < count) size *= 2;
  return size;
}

function roundName(round, totalRounds) {
  const remaining = totalRounds - round;
  if (remaining === 0) return 'Final';
  if (remaining === 1) return 'Semi-final';
  if (remaining === 2) return 'Quarter-final';
  return `Round ${round}`;
}

async function advanceWinner(tx, match, winnerId) {
  if (!match.nextMatchId) return;
  const occupied = await tx.matchParticipant.findFirst({
    where: { matchId: match.nextMatchId, seed: match.nextMatchSlot }
  });
  if (occupied) throw new Error('The next bracket position is already occupied');
  await tx.matchParticipant.create({
    data: { matchId: match.nextMatchId, userId: winnerId, seed: match.nextMatchSlot }
  });
}

async function generateKnockoutDraw({ tournamentId, actorId }) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { registrations: { where: { status: 'CONFIRMED' }, orderBy: { tournamentNumber: 'asc' } }, matches: true }
    });
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.matches.length) throw new Error('A draw already exists and cannot be replaced');
    if (tournament.registrations.length < 2) throw new Error('At least two confirmed players are required');

    const bracketSize = bracketSizeFor(tournament.registrations.length);
    const totalRounds = Math.log2(bracketSize);
    const matchesByRound = new Map();

    for (let round = totalRounds; round >= 1; round -= 1) {
      const count = 2 ** (totalRounds - round);
      const matches = [];
      for (let position = 1; position <= count; position += 1) {
        const next = matchesByRound.get(round + 1)?.[Math.ceil(position / 2) - 1];
        matches.push(await tx.match.create({
          data: {
            tournamentId,
            round,
            bracketPosition: position,
            status: 'SCHEDULED',
            nextMatchId: next?.id || null,
            nextMatchSlot: next ? ((position - 1) % 2) + 1 : null
          }
        }));
      }
      matchesByRound.set(round, matches);
    }

    const firstRound = matchesByRound.get(1);
    const players = tournament.registrations.map((registration) => registration.userId);
    for (let index = 0; index < firstRound.length; index += 1) {
      const match = firstRound[index];
      const pair = players.slice(index * 2, index * 2 + 2);
      for (const [seed, userId] of pair.entries()) {
        await tx.matchParticipant.create({ data: { matchId: match.id, userId, seed: seed + 1 } });
      }
      if (pair.length === 1) {
        await tx.match.update({ where: { id: match.id }, data: { status: 'VERIFIED', result: { winnerId: pair[0], reason: 'BYE' } } });
        await advanceWinner(tx, match, pair[0]);
      }
    }

    await tx.auditLog.create({
      data: { actorId, action: 'KNOCKOUT_DRAW_GENERATED', entity: 'Tournament', entityId: tournamentId, metadata: { bracketSize, totalRounds } }
    });
    return { totalRounds, bracketSize };
  });
}

async function progressVerifiedResult({ matchId, resultId, actorId }) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { participants: true, results: { where: { id: resultId } } }
    });
    const result = match?.results[0];
    if (!match || !result) throw new Error('Match result not found');
    const scores = result.scores;
    const scored = match.participants.map((participant) => ({ userId: participant.userId, score: Number(scores[participant.userId]) }));
    if (scored.length !== 2 || scored.some((entry) => !Number.isFinite(entry.score)) || scored[0].score === scored[1].score) {
      throw new Error('Knockout results require two valid, non-drawn scores');
    }
    const winner = scored.sort((a, b) => b.score - a.score)[0];
    await tx.matchResult.update({ where: { id: result.id }, data: { status: 'VERIFIED', approvedById: actorId, approvedAt: new Date() } });
    await tx.match.update({ where: { id: match.id }, data: { status: 'VERIFIED', result: { scores, winnerId: winner.userId } } });
    await advanceWinner(tx, match, winner.userId);
    await tx.auditLog.create({ data: { actorId, action: 'KNOCKOUT_RESULT_VERIFIED', entity: 'Match', entityId: match.id, metadata: { resultId, winnerId: winner.userId } } });
    return winner.userId;
  });
}

module.exports = { generateKnockoutDraw, progressVerifiedResult, roundName };
