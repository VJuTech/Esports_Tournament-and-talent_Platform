const { prisma } = require('../config/database');
const { listGames, findGameById, createGame, updateGame } = require('../models/game.model');
const { storeImage } = require('../services/image.service');

function gameData(body, imageUrl) {
  return {
    name: body.name.trim(),
    slug: body.slug.trim().toLowerCase(),
    description: body.description?.trim() || null,
    supportedMode: body.supportedMode?.trim() || null,
    imageUrl: imageUrl || null,
    rulesUrl: body.rulesUrl?.trim() || null,
    formats: body.formats?.split(',').map((format) => format.trim()).filter(Boolean) || []
  };
}

async function index(req, res, next) {
  try {
    return res.render('admin/games/index', { title: 'Game catalogue', games: await listGames(true), error: null });
  } catch (error) {
    return next(error);
  }
}

async function publicIndex(req, res, next) {
  try { return res.render('games/index', { title: 'Supported games', games: await listGames(false) }); } catch (error) { return next(error); }
}

async function newGame(req, res) {
  return res.render('admin/games/form', { title: 'Add a game', game: null, error: null });
}

async function edit(req, res, next) {
  try {
    const game = await findGameById(req.params.id);
    if (!game) return res.status(404).render('404', { title: 'Game not found' });
    return res.render('admin/games/form', { title: 'Edit game', game, error: null });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    await createGame(gameData(req.body, await storeImage(req.file, req.session.user.id)));
    return res.redirect('/admin/games');
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).render('admin/games/form', { title: 'Add a game', game: req.body, error: 'Game name and slug must be unique.' });
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const current = await findGameById(req.params.id);
    if (!current) return res.status(404).render('404', { title: 'Game not found' });
    await updateGame(req.params.id, gameData(req.body, (await storeImage(req.file, req.session.user.id)) || current.imageUrl));
    await prisma.auditLog.create({
      data: { actorId: req.session.user.id, action: 'GAME_UPDATED', entity: 'Game', entityId: req.params.id, metadata: { fields: Object.keys(gameData(req.body)) } }
    });
    return res.redirect('/admin/games');
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).render('admin/games/form', { title: 'Edit game', game: { ...req.body, id: req.params.id }, error: 'Game name and slug must be unique.' });
    return next(error);
  }
}

async function toggle(req, res, next) {
  try {
    const game = await findGameById(req.params.id);
    if (!game) return res.status(404).render('404', { title: 'Game not found' });
    await updateGame(game.id, { isActive: !game.isActive });
    await prisma.auditLog.create({
      data: { actorId: req.session.user.id, action: game.isActive ? 'GAME_DEACTIVATED' : 'GAME_ACTIVATED', entity: 'Game', entityId: game.id }
    });
    return res.redirect('/admin/games');
  } catch (error) {
    return next(error);
  }
}

module.exports = { index, publicIndex, newGame, edit, create, update, toggle };
