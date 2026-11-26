const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const dalamPengembangan = require('../middlewares/dalamPengembangan');

// Modul Perizinan sedang dikerjakan ulang. Endpoint yang direncanakan:
//   GET  /api/izin?status=        daftar izin sesuai cakupan peran
//   GET  /api/izin/:id            detail izin
//   GET  /api/izin/:id/bukti      file bukti
//   POST /api/izin                ajukan izin (penghuni, multipart field "bukti")
//   PUT  /api/izin/:id/setujui    setujui (fasil, admin)
//   PUT  /api/izin/:id/tolak      tolak dengan alasan (fasil, admin)
// Model Izin tetap ada dan sudah dipakai status presensi, dashboard, dan notifikasi.
// Upload bukti bisa memakai `upload` dari middlewares/upload.js.
router.use(protect);
router.use(dalamPengembangan);

module.exports = router;
