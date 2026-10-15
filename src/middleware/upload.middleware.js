const multer = require('multer');

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) return callback(new Error('Upload a JPG, PNG, or WebP image.'));
    return callback(null, true);
  }
});

module.exports = { imageUpload };
