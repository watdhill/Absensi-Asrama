const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const httpError = require('../utils/httpError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Upload ke folder uploads/ dengan nama file acak, maksimal 5 MB
function buatUpload({ prefix, tipe, pesanTipe }) {
  return multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${prefix}${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (tipe.includes(file.mimetype)) return cb(null, true);
      cb(httpError(400, pesanTipe));
    },
  });
}

// bukti izin: JPG/PNG/PDF
const upload = buatUpload({
  prefix: '',
  tipe: ['image/jpeg', 'image/png', 'application/pdf'],
  pesanTipe: 'Format file harus JPG, PNG, atau PDF',
});

// foto presensi dari kamera: JPG/PNG
const uploadFoto = buatUpload({
  prefix: 'presensi-',
  tipe: ['image/jpeg', 'image/png'],
  pesanTipe: 'Foto presensi harus berformat JPG atau PNG',
});

module.exports = { upload, uploadFoto, UPLOAD_DIR };
