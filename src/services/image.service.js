const path = require('node:path');
const { prisma } = require('../config/database');

async function storeImage(file, uploadedById) {
  if (!file) return null;
  const asset = await prisma.imageAsset.create({
    data: {
      fileName: path.basename(file.originalname),
      contentType: file.mimetype,
      bytes: file.buffer,
      size: file.size,
      uploadedById
    }
  });
  return `/media/${asset.id}`;
}

async function serveImage(req, res, next) {
  try {
    const asset = await prisma.imageAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) return res.status(404).render('404', { title: 'Image not found' });
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(asset.contentType);
    return res.send(asset.bytes);
  } catch (error) { return next(error); }
}

module.exports = { storeImage, serveImage };
