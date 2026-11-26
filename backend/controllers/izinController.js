const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../middlewares/upload');
const { User, Asrama, Izin } = require('../models');
const httpError = require('../utils/httpError');

const STATUS_IZIN = ['menunggu', 'disetujui', 'ditolak'];
const ALASAN_MIN = 10;
const ALASAN_MAX = 500;

const tanggalValid = (t) => /^\d{4}-\d{2}-\d{2}$/.test(t || '') && !Number.isNaN(new Date(`${t}T00:00:00Z`).getTime());

// Cakupan data per peran:
//   penghuni -> hanya izin miliknya
//   fasil    -> izin penghuni di asrama yang ia pegang (semua asrama kalau belum ditautkan)
//   admin    -> semua
function cakupan(user) {
  if (user.role === 'penghuni') return { izin: { userId: user.id }, penghuni: {} };
  if (user.role === 'fasil' && user.asramaId) return { izin: {}, penghuni: { asramaId: user.asramaId } };
  return { izin: {}, penghuni: {} };
}

const includePenghuni = (where = {}) => ({
  model: User,
  as: 'penghuni',
  attributes: ['id', 'name', 'nomorInduk', 'kamar', 'asramaId', 'prodi', 'telepon'],
  where,
  include: { model: Asrama, attributes: ['id', 'nama'] },
});
const includeReviewer = { model: User, as: 'reviewer', attributes: ['id', 'name', 'role'] };

// Ambil satu izin yang boleh diakses user; 404 kalau tidak ada atau di luar cakupan
async function izinTerjangkau(id, user) {
  const scope = cakupan(user);
  const izin = await Izin.findOne({
    where: { id, ...scope.izin },
    include: [includePenghuni(scope.penghuni), includeReviewer],
  });
  if (!izin) throw httpError(404, 'Data izin tidak ditemukan');
  return izin;
}

// GET /api/izin?status= — daftar izin sesuai cakupan peran, terbaru di atas
exports.list = async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && !STATUS_IZIN.includes(status)) throw httpError(400, 'Status tidak valid');

    const scope = cakupan(req.user);
    const semua = await Izin.findAll({
      where: scope.izin,
      include: [includePenghuni(scope.penghuni), includeReviewer],
      order: [['createdAt', 'DESC']],
    });

    // jumlah per status untuk tab, dihitung sebelum filter
    const jumlah = { semua: semua.length };
    for (const s of STATUS_IZIN) jumlah[s] = semua.filter((i) => i.status === s).length;

    const data = status ? semua.filter((i) => i.status === status) : semua;
    res.status(200).json({ success: true, data, jumlah });
  } catch (err) {
    next(err);
  }
};

// GET /api/izin/:id
exports.detail = async (req, res, next) => {
  try {
    const izin = await izinTerjangkau(req.params.id, req.user);
    res.status(200).json({ success: true, data: izin });
  } catch (err) {
    next(err);
  }
};

// GET /api/izin/:id/bukti — file bukti, ditampilkan inline (gambar / PDF)
exports.bukti = async (req, res, next) => {
  try {
    const izin = await izinTerjangkau(req.params.id, req.user);
    // basename mencegah path traversal kalau isi kolom buktiFile dimanipulasi
    const file = path.join(UPLOAD_DIR, path.basename(izin.buktiFile));
    if (!fs.existsSync(file)) throw httpError(404, 'File bukti tidak ditemukan');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(izin.buktiNama || 'bukti')}`);
    res.sendFile(file);
  } catch (err) {
    next(err);
  }
};

// POST /api/izin (penghuni, multipart: jenis, tanggalMulai, tanggalSelesai, alasan, bukti)
exports.ajukan = async (req, res, next) => {
  try {
    const jenis = (req.body.jenis || '').trim();
    const alasan = (req.body.alasan || '').trim();
    const { tanggalMulai, tanggalSelesai } = req.body;

    if (!jenis) throw httpError(400, 'Jenis izin wajib dipilih');
    if (!tanggalValid(tanggalMulai)) throw httpError(400, 'Tanggal mulai tidak valid');
    if (!tanggalValid(tanggalSelesai)) throw httpError(400, 'Tanggal selesai tidak valid');
    if (tanggalSelesai < tanggalMulai) throw httpError(400, 'Tanggal selesai tidak boleh sebelum tanggal mulai');
    if (alasan.length < ALASAN_MIN) throw httpError(400, `Alasan minimal ${ALASAN_MIN} karakter`);
    if (alasan.length > ALASAN_MAX) throw httpError(400, `Alasan maksimal ${ALASAN_MAX} karakter`);
    if (!req.file) throw httpError(400, 'File bukti wajib diunggah');

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
    // pengajuan gagal -> bukti yang sudah terunggah tidak disimpan
    if (req.file) fs.rm(req.file.path, () => {});
    next(err);
  }
};

// Putuskan izin yang masih menunggu. Update memakai syarat status 'menunggu'
// supaya dua fasil yang memutuskan bersamaan tidak saling menimpa.
async function putuskan(req, perubahan) {
  const izin = await izinTerjangkau(req.params.id, req.user);
  if (izin.status !== 'menunggu') throw httpError(409, 'Izin ini sudah diputuskan sebelumnya');

  const [jumlah] = await Izin.update(
    { ...perubahan, reviewedBy: req.user.id, reviewedAt: new Date() },
    { where: { id: izin.id, status: 'menunggu' } }
  );
  if (!jumlah) throw httpError(409, 'Izin ini sudah diputuskan sebelumnya');
  return izinTerjangkau(izin.id, req.user);
}

// PUT /api/izin/:id/setujui (fasil, admin)
exports.setujui = async (req, res, next) => {
  try {
    const izin = await putuskan(req, { status: 'disetujui', alasanPenolakan: null });
    res.status(200).json({ success: true, data: izin, message: 'Izin disetujui' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/izin/:id/tolak (fasil, admin), body { alasan }
exports.tolak = async (req, res, next) => {
  try {
    const alasan = (req.body.alasan || '').trim();
    if (!alasan) throw httpError(400, 'Alasan penolakan wajib diisi');
    if (alasan.length > ALASAN_MAX) throw httpError(400, `Alasan penolakan maksimal ${ALASAN_MAX} karakter`);
    const izin = await putuskan(req, { status: 'ditolak', alasanPenolakan: alasan });
    res.status(200).json({ success: true, data: izin, message: 'Izin ditolak' });
  } catch (err) {
    next(err);
  }
};
