const { prisma } = require('../config/database');

async function create(req, res, next) {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.body.tournamentId } });
    if (!tournament || tournament.status !== 'PUBLISHED') return res.status(400).redirect(`/tournaments/${req.body.tournamentId}?error=Tournament%20is%20not%20open`);
    const now = new Date();
    if (now < tournament.registrationOpensAt || now > tournament.registrationDeadline) return res.status(400).redirect(`/tournaments/${tournament.id}?error=Registration%20is%20closed`);
    const eligibleProfile = await prisma.gameProfile.findUnique({ where: { userId_gameId: { userId: req.session.user.id, gameId: tournament.gameId } } });
    if (!eligibleProfile) return res.status(400).redirect(`/tournaments/${tournament.id}?error=${encodeURIComponent('Add your game profile before registering')}`);
    let teamId = null;
    if (tournament.participationType === 'TEAM') {
      const team = await prisma.team.findFirst({ where: { id: req.body.teamId, gameId: tournament.gameId, members: { some: { userId: req.session.user.id, status: 'ACTIVE' } } } });
      if (!team) return res.status(400).redirect(`/tournaments/${tournament.id}?error=${encodeURIComponent('Select an eligible team for this competition')}`);
      teamId = team.id;
    }
    const registration = await prisma.$transaction(async (tx) => {
      const existing = await tx.registration.findUnique({ where: { tournamentId_userId: { tournamentId: tournament.id, userId: req.session.user.id } } });
      if (existing) throw new Error('You are already registered for this tournament');
      const count = await tx.registration.count({ where: { tournamentId: tournament.id, status: { in: ['PENDING', 'CONFIRMED'] } } });
      if (count >= tournament.capacity) throw new Error('Tournament capacity has been reached');
      const payment = await tx.payment.create({
        data: {
          providerReference: `REG-${tournament.code}-${req.session.user.id}-${Date.now()}`,
          amount: tournament.entryFee,
          currency: tournament.currency,
          status: 'PENDING'
        }
      }, { isolationLevel: 'Serializable' });
      return tx.registration.create({
        data: {
          tournamentId: tournament.id,
          userId: req.session.user.id,
          status: 'PENDING',
          paymentId: payment.id,
          teamId,
          feeAmount: tournament.entryFee,
          feeCurrency: tournament.currency
        }
      });
    });
    return res.redirect(`/registrations/${registration.id}`);
  } catch (error) {
    if (error.message === 'You are already registered for this tournament' || error.message === 'Tournament capacity has been reached') {
      return res.status(409).redirect(`/tournaments/${req.body.tournamentId}?error=${encodeURIComponent(error.message)}`);
    }
    return next(error);
  }
}

async function history(req, res, next) {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.session.user.id },
      include: { tournament: { include: { game: true } }, payment: true, receipt: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.render('registrations/index', { title: 'Registration history', registrations });
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const registration = await prisma.registration.findFirst({
      where: { id: req.params.id, userId: req.session.user.id },
      include: { tournament: { include: { game: true } }, payment: true, receipt: true }
    });
    if (!registration) return res.status(404).render('404', { title: 'Registration not found' });
    return res.render('registrations/show', { title: 'Registration details', registration, error: req.query.error || null });
  } catch (error) {
    return next(error);
  }
}

async function cancel(req, res, next) {
  try {
    const registration = await prisma.registration.findFirst({ where: { id: req.params.id, userId: req.session.user.id } });
    if (!registration || ['CANCELLED', 'REFUNDED', 'REJECTED'].includes(registration.status)) {
      return res.status(400).redirect(`/registrations/${req.params.id}?error=Registration%20cannot%20be%20cancelled`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.registration.update({ where: { id: registration.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Cancelled by participant' } });
      if (registration.paymentId) await tx.payment.update({ where: { id: registration.paymentId }, data: { status: 'REFUNDED' } });
    });
    return res.redirect(`/registrations/${registration.id}`);
  } catch (error) {
    return next(error);
  }
}

module.exports = { create, history, show, cancel };
