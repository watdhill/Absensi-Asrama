const fs = require('fs');
const path = require('path');
const { User, Asrama, Izin } = require('../models');
const { UPLOAD_DIR } = require('../middlewares/upload');
const httpError = require('../utils/httpError');

const includePenghuni = (user) => ({
  model: User,
  as: 'penghuni',
  attributes: ['id', 'name', 'nomorInduk', 'kamar', 'asramaId'],
  include: { model: Asrama, attributes: ['id', 'nama'] },
  // fasil hanya melihat izin dari penghuni di asramanya
  where: user.role === 'fasil' && user.asramaId ? { asramaId: user.asramaId } : undefined,
});

// Ambil satu izin sekaligus cek hak akses user yang meminta
async function cariIzin(id, user) {
  const where = { id };
  if (user.role === 'penghuni') where.userId = user.id;
  const izin = await Izin.findOne({
    where,
    include: [includePenghuni(user), { model: User, as: 'reviewer', attributes: ['id', 'name'] }],
  });
  if (!izin) throw httpError(404, 'Pengajuan izin tidak ditemukan');
  return izin;
}

// GET /api/izin?status=menunggu
exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'penghuni') where.userId = req.user.id;
    if (req.query.status) where.status = req.query.status;
    const data = await Izin.findAll({
      where,
      include: includePenghuni(req.user),
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/izin/:id
exports.detail = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await cariIzin(req.params.id, req.user) });
  } catch (err) {
    next(err);
  }
};

// GET /api/izin/:id/bukti — file bukti, hanya untuk yang berhak melihat izinnya
exports.bukti = async (req, res, next) => {
  try {
    const izin = await cariIzin(req.params.id, req.user);
    const file = path.join(UPLOAD_DIR, path.basename(izin.buktiFile));
    if (!fs.existsSync(file)) throw httpError(404, 'File bukti tidak ditemukan');
    res.type(izin.buktiTipe || path.extname(file));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(izin.buktiNama || izin.buktiFile)}"`);
    res.sendFile(file);
  } catch (err) {
    next(err);
  }
};

// POST /api/izin (penghuni, multipart/form-data dengan field "bukti")
exports.create = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Bukti izin wajib diunggah');
    const { jenis, tanggalMulai, tanggalSelesai, alasan } = req.body;
    if (!tanggalMulai || !tanggalSelesai) throw httpError(400, 'Tanggal mulai dan selesai wajib diisi');

    const izin = await Izin.create({
      userId: req.user.id,
      jenis,
      tanggalMulai,
      tanggalSelesai,
      alasan,
      buktiFile: req.file.filename,
      buktiNama: req.file.originalname,
      buktiTipe: req.file.mimetype,
      buktiUkuran: req.file.size,
    });
    res.status(201).json({ success: true, data: izin, message: 'Pengajuan izin berhasil dikirim' });
  } catch (err) {
    // file sudah terlanjur tersimpan, hapus kalau data izinnya gagal dibuat
    if (req.file) fs.rm(req.file.path, () => {});
    next(err);
  }
};

async function putuskan(req, status, alasanPenolakan = null) {
  const izin = await cariIzin(req.params.id, req.user);
  if (izin.status !== 'menunggu') throw httpError(400, 'Pengajuan ini sudah diputuskan sebelumnya');
  await izin.update({ status, alasanPenolakan, reviewedBy: req.user.id, reviewedAt: new Date() });
  return cariIzin(izin.id, req.user);
}

// PUT /api/izin/:id/setujui (fasil, admin)
exports.setujui = async (req, res, next) => {
  try {
    const data = await putuskan(req, 'disetujui');
    res.status(200).json({ success: true, data, message: 'Pengajuan izin berhasil disetujui' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/izin/:id/tolak (fasil, admin) — alasan wajib
exports.tolak = async (req, res, next) => {
  try {
    const alasan = (req.body.alasan || '').trim();
    if (!alasan) throw httpError(400, 'Alasan penolakan wajib diisi');
    const data = await putuskan(req, 'ditolak', alasan);
    res.status(200).json({ success: true, data, message: 'Pengajuan izin telah ditolak' });
  } catch (err) {
    next(err);
  }
};
