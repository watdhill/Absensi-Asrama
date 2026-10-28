const express = require('express');
const router = express.Router();
const { protect, allow } = require('../middlewares/auth');
const {
  hariIni,
  presensi,
  riwayatSaya,
  dataPresensi,
  koreksi,
  riwayatKoreksi,
} = require('../controllers/presensiController');

router.use(protect);

// penghuni
router.get('/hari-ini', allow('penghuni'), hariIni);
router.get('/saya', allow('penghuni'), riwayatSaya);
router.post('/', allow('penghuni'), presensi);

// fasil & admin
router.get('/', allow('fasil', 'admin'), dataPresensi);
router.get('/koreksi', allow('fasil', 'admin'), riwayatKoreksi);
router.put('/koreksi', allow('fasil', 'admin'), koreksi);

module.exports = router;
