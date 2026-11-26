const express = require('express');
const router = express.Router();
const { protect, allow } = require('../middlewares/auth');
const asrama = require('../controllers/asramaController');
const { dashboard } = require('../controllers/dashboardController');
const notifikasi = require('../controllers/notifikasiController');
const dalamPengembangan = require('../middlewares/dalamPengembangan');

router.use(protect);

// gedung & kamar — endpoint baca tetap aktif karena dipakai form akun,
// dashboard admin, dan data presensi
router.get('/asrama', asrama.list);
router.get('/asrama/:id', asrama.detail);
router.get('/asrama/:id/kamar', allow('admin'), asrama.kamar);

// gedung & kamar — kelola data sedang dalam pengembangan
router.post('/asrama', allow('admin'), dalamPengembangan);
router.put('/asrama/:id', allow('admin'), dalamPengembangan);
router.delete('/asrama/:id', allow('admin'), dalamPengembangan);
router.post('/asrama/:id/kamar', allow('admin'), dalamPengembangan);
router.put('/kamar/:id', allow('admin'), dalamPengembangan);
router.delete('/kamar/:id', allow('admin'), dalamPengembangan);

// laporan rekap kehadiran — sedang dalam pengembangan
router.get('/laporan/rekap', allow('fasil', 'admin'), dalamPengembangan);
router.get('/laporan/rekap/excel', allow('fasil', 'admin'), dalamPengembangan);

router.get('/dashboard', allow('fasil', 'admin'), dashboard);
router.get('/notifikasi', notifikasi.list);

module.exports = router;
