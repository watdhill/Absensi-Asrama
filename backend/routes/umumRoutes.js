const express = require('express');
const router = express.Router();
const { protect, allow } = require('../middlewares/auth');
const asrama = require('../controllers/asramaController');
const { dashboard } = require('../controllers/dashboardController');
const notifikasi = require('../controllers/notifikasiController');

router.use(protect);

router.get('/asrama', asrama.list);
router.get('/dashboard', allow('fasil', 'admin'), dashboard);
router.get('/notifikasi', notifikasi.list);

module.exports = router;
