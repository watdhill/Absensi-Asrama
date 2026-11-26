const { Asrama, sequelize } = require('../models');
const { KAPASITAS_DEFAULT, rekapKamar } = require('../utils/kamar');
const httpError = require('../utils/httpError');

// Kelola gedung & kamar (tambah, ubah, hapus) sedang dalam pengembangan.
// Yang tersisa di sini hanya endpoint baca yang dipakai modul lain.

// kolom hitungan tambahan untuk setiap gedung
const STATISTIK = [
  [`(SELECT COUNT(*) FROM "Users" u WHERE u."asramaId" = "Asrama"."id" AND u.role = 'penghuni' AND u.status = 'aktif')`, 'jumlahPenghuni'],
  [`(SELECT COUNT(DISTINCT u.kamar) FROM "Users" u WHERE u."asramaId" = "Asrama"."id" AND u.role = 'penghuni' AND u.status = 'aktif')`, 'kamarTerisi'],
  [`(SELECT COUNT(*) FROM "Kamar" k WHERE k."asramaId" = "Asrama"."id")`, 'jumlahKamar'],
  [`(SELECT COALESCE(SUM(k.kapasitas), 0) FROM "Kamar" k WHERE k."asramaId" = "Asrama"."id")`, 'kapasitasTotal'],
].map(([sql, nama]) => [sequelize.literal(sql), nama]);

async function cari(id) {
  const asrama = await Asrama.findByPk(id, { attributes: { include: STATISTIK } });
  if (!asrama) throw httpError(404, 'Gedung asrama tidak ditemukan');
  return asrama;
}

// GET /api/asrama — daftar gedung beserta statistik penghuni & kamar
exports.list = async (req, res, next) => {
  try {
    const data = await Asrama.findAll({ attributes: { include: STATISTIK }, order: [['kode', 'ASC']] });
    res.status(200).json({ success: true, data, kapasitasKamar: KAPASITAS_DEFAULT });
  } catch (err) {
    next(err);
  }
};

// GET /api/asrama/:id
exports.detail = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await cari(req.params.id) });
  } catch (err) {
    next(err);
  }
};

// GET /api/asrama/:id/kamar (admin) — semua kamar & penghuninya
exports.kamar = async (req, res, next) => {
  try {
    const asrama = await cari(req.params.id);
    res.status(200).json({ success: true, data: await rekapKamar(asrama.id), asrama });
  } catch (err) {
    next(err);
  }
};
