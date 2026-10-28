const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TIPE_DIIZINKAN = ['image/jpeg', 'image/png', 'application/pdf'];

// Upload bukti izin: JPG/PNG/PDF, maksimal 5 MB, nama file diacak
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (TIPE_DIIZINKAN.includes(file.mimetype)) return cb(null, true);
    cb(httpError(400, 'Format file harus JPG, PNG, atau PDF'));
  },
});

module.exports = { upload, UPLOAD_DIR };
