const { findUserById, updateProfile } = require('../models/user.model');
const { listActiveGames, upsertGameProfile } = require('../models/game-profile.model');

async function show(req, res, next) {
  try {
    return res.render('profile/index', {
      title: 'My profile',
      profile: await findUserById(req.session.user.id),
      games: await listActiveGames(),
      message: null,
      error: null
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const { displayName, country, profileImage, eligibilityInfo } = req.body;
    await updateProfile(req.session.user.id, {
      displayName: displayName.trim(),
      country: country.trim(),
      profileImage: profileImage.trim() || null,
      eligibilityInfo: eligibilityInfo.trim() ? { notes: eligibilityInfo.trim() } : null
    });
    const gameIds = Array.isArray(req.body.gameId) ? req.body.gameId : [req.body.gameId].filter(Boolean);
    const inGameIds = Array.isArray(req.body.inGameId) ? req.body.inGameId : [req.body.inGameId].filter(Boolean);
    await Promise.all(gameIds.map((gameId, index) => inGameIds[index] ? upsertGameProfile(req.session.user.id, gameId, inGameIds[index].trim()) : null));
    return res.render('profile/index', {
      title: 'My profile',
      profile: await findUserById(req.session.user.id),
      games: await listActiveGames(),
      message: 'Your profile has been updated.',
      error: null
    });
  } catch (error) {
    return next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    return res.render('dashboard', { title: 'Player dashboard', profile: await findUserById(req.session.user.id) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { show, update, dashboard };
