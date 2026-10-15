const express = require('express');
const { serveImage } = require('../services/image.service');

const router = express.Router();
router.get('/:id', serveImage);
module.exports = router;
