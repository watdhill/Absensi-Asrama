const express = require('express');
const router = express.Router();
const { protect, allow } = require('../middlewares/auth');
const asrama = require('../controllers/asramaController');
const { dashboard } = require('../controllers/dashboardController');
const notifikasi = require('../controllers/notifikasiController');
const laporan = require('../controllers/laporanController');

router.use(protect);

// gedung & kamar
router.get('/asrama', asrama.list);
router.get('/asrama/:id', asrama.detail);
router.post('/asrama', allow('admin'), asrama.create);
router.put('/asrama/:id', allow('admin'), asrama.update);
router.delete('/asrama/:id', allow('admin'), asrama.remove);
router.get('/asrama/:id/kamar', allow('admin'), asrama.kamar);
router.post('/asrama/:id/kamar', allow('admin'), asrama.tambahKamar);
router.put('/kamar/:id', allow('admin'), asrama.ubahKamar);
router.delete('/kamar/:id', allow('admin'), asrama.hapusKamar);

// laporan rekap kehadiran
router.get('/laporan/rekap', allow('fasil', 'admin'), laporan.rekap);
router.get('/laporan/rekap/excel', allow('fasil', 'admin'), laporan.excel);

router.get('/dashboard', allow('fasil', 'admin'), dashboard);
router.get('/notifikasi', notifikasi.list);

module.exports = router;
