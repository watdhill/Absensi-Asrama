const express = require('express');
const router = express.Router();
const { protect, allow } = require('../middlewares/auth');
const { uploadFoto } = require('../middlewares/upload');
const {
  hariIni,
  presensi,
  foto,
  riwayatSaya,
  dataPresensi,
  koreksi,
  riwayatKoreksi,
} = require('../controllers/presensiController');

router.use(protect);

// penghuni
router.get('/hari-ini', allow('penghuni'), hariIni);
router.get('/saya', allow('penghuni'), riwayatSaya);
router.post('/', allow('penghuni'), uploadFoto.single('foto'), presensi);

// fasil & admin
router.get('/', allow('fasil', 'admin'), dataPresensi);
router.get('/koreksi', allow('fasil', 'admin'), riwayatKoreksi);
router.put('/koreksi', allow('fasil', 'admin'), koreksi);

// semua role (hak akses dicek di controller)
router.get('/:id/foto', foto);

module.exports = router;
