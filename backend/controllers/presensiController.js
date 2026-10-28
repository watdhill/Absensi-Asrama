const { Op } = require('sequelize');
const { sequelize, User, Asrama, Presensi, KoreksiPresensi } = require('../models');
const SESI = require('../config/sesi');
const { SESI_KEYS, sekarang, statusSesi, sesiAktif } = require('../utils/waktu');
const { muatStatus, riwayatPenghuni } = require('../utils/statusPresensi');
const httpError = require('../utils/httpError');

const STATUS_KOREKSI = ['hadir', 'izin', 'tidak_hadir'];

// Fasil hanya melihat penghuni di asramanya; admin melihat semua
const scopeAsrama = (user) => (user.role === 'fasil' && user.asramaId ? { asramaId: user.asramaId } : {});

// GET /api/presensi/hari-ini (penghuni) — kartu presensi di dashboard
exports.hariIni = async (req, res, next) => {
  try {
    const now = sekarang();
    const lookup = await muatStatus([req.user.id], now.tanggal, now.tanggal, now);
    const sesi = SESI_KEYS.map((key) => {
      const { label, mulai, selesai, mulaiDetik, selesaiDetik } = SESI[key];
      const state = statusSesi(key, now);
      return {
        sesi: key,
        label,
        mulai,
        selesai,
        state,
        // dipakai frontend untuk countdown
        sisaDetik: state === 'dibuka' ? selesaiDetik - now.detik : 0,
        mulaiDalamDetik: state === 'belum_dibuka' ? mulaiDetik - now.detik : 0,
        ...lookup(req.user.id, now.tanggal, key),
      };
    });
    res.status(200).json({ success: true, data: { tanggal: now.tanggal, jam: now.jam, sesiAktif: sesiAktif(now), sesi } });
  } catch (err) {
    next(err);
  }
};

// POST /api/presensi (penghuni) — sesi ditentukan otomatis dari jam server
exports.presensi = async (req, res, next) => {
  try {
    const now = sekarang();
    const sesi = sesiAktif(now);
    if (!sesi) throw httpError(400, 'Tidak ada sesi presensi yang sedang dibuka');

    const sudah = await Presensi.findOne({ where: { userId: req.user.id, tanggal: now.tanggal, sesi } });
    if (sudah) throw httpError(409, `Anda sudah melakukan ${SESI[sesi].label.toLowerCase()} hari ini`);

    const presensi = await Presensi.create({
      userId: req.user.id,
      tanggal: now.tanggal,
      sesi,
      waktu: now.jam,
      status: 'hadir',
    });
    res.status(201).json({ success: true, data: presensi });
  } catch (err) {
    // unique index menolak dua request yang masuk bersamaan
    if (err.name === 'SequelizeUniqueConstraintError') {
      return next(httpError(409, 'Anda sudah melakukan presensi untuk sesi ini'));
    }
    next(err);
  }
};

// GET /api/presensi/saya?bulan=2026-09&sesi=pagi&status=hadir (penghuni)
exports.riwayatSaya = async (req, res, next) => {
  try {
    const now = sekarang();
    const bulan = /^\d{4}-\d{2}$/.test(req.query.bulan || '') ? req.query.bulan : now.tanggal.slice(0, 7);
    const [y, m] = bulan.split('-').map(Number);
    const akhirBulan = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

    const semua = await riwayatPenghuni(req.user, `${bulan}-01`, akhirBulan, now);

    // ringkasan dihitung dari seluruh bulan, sebelum filter sesi/status
    const tercatat = semua.filter((r) => r.status !== 'belum');
    const hitung = (s) => tercatat.filter((r) => r.status === s).length;
    const ringkasan = {
      hadir: hitung('hadir'),
      tidakHadir: hitung('tidak_hadir'),
      izin: hitung('izin'),
      persentase: tercatat.length ? Math.round((hitung('hadir') / tercatat.length) * 100) : 0,
    };

    const data = semua.filter(
      (r) => (!req.query.sesi || r.sesi === req.query.sesi) && (!req.query.status || r.status === req.query.status)
    );
    res.status(200).json({ success: true, data, ringkasan, bulan });
  } catch (err) {
    next(err);
  }
};

// GET /api/presensi?tanggal=&sesi=&status=&asramaId=&kamar=&q= (fasil, admin)
exports.dataPresensi = async (req, res, next) => {
  try {
    const now = sekarang();
    const tanggal = req.query.tanggal || now.tanggal;
    const { sesi, status, asramaId, kamar, q } = req.query;

    const where = { role: 'penghuni', status: 'aktif', tanggalMasuk: { [Op.lte]: tanggal }, ...scopeAsrama(req.user) };
    if (asramaId && req.user.role === 'admin') where.asramaId = asramaId;
    if (kamar) where.kamar = { [Op.iLike]: `%${kamar}%` };
    if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { nomorInduk: { [Op.iLike]: `%${q}%` } }];

    const penghuni = await User.findAll({ where, include: Asrama, order: [['kamar', 'ASC'], ['name', 'ASC']] });
    const lookup = await muatStatus(penghuni.map((p) => p.id), tanggal, tanggal, now);

    let rows = penghuni.map((p) => {
      const pagi = lookup(p.id, tanggal, 'pagi');
      const malam = lookup(p.id, tanggal, 'malam');
      return { penghuni: p, tanggal, pagi, malam, status: ringkasStatus([pagi.status, malam.status]) };
    });

    if (status) rows = rows.filter((r) => (sesi ? r[sesi].status : r.status) === status);
    res.status(200).json({ success: true, data: rows, tanggal });
  } catch (err) {
    next(err);
  }
};

// Status keseluruhan satu hari untuk kolom "Status" di tabel fasil
function ringkasStatus(statuses) {
  for (const s of ['tidak_hadir', 'belum', 'izin']) if (statuses.includes(s)) return s;
  return 'hadir';
}

// PUT /api/presensi/koreksi (fasil, admin)
exports.koreksi = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const now = sekarang();
    const { userId, tanggal, sesi, status, alasan } = req.body;
    if (!SESI_KEYS.includes(sesi)) throw httpError(400, 'Sesi tidak valid');
    if (!STATUS_KOREKSI.includes(status)) throw httpError(400, 'Status tidak valid');
    if (!alasan || !alasan.trim()) throw httpError(400, 'Alasan perubahan wajib diisi');
    if (!tanggal || tanggal > now.tanggal) throw httpError(400, 'Tanggal tidak valid');

    const penghuni = await User.findOne({ where: { id: userId, role: 'penghuni', ...scopeAsrama(req.user) } });
    if (!penghuni) throw httpError(404, 'Penghuni tidak ditemukan');

    const lookup = await muatStatus([penghuni.id], tanggal, tanggal, now);
    const statusLama = lookup(penghuni.id, tanggal, sesi).status;
    if (statusLama === status) throw httpError(400, 'Status baru sama dengan status sekarang');

    const record = await Presensi.findOne({ where: { userId, tanggal, sesi }, transaction: t });
    if (record) {
      await record.update({ status }, { transaction: t });
    } else {
      await Presensi.create({ userId, tanggal, sesi, status, waktu: null }, { transaction: t });
    }
    const log = await KoreksiPresensi.create(
      { userId, tanggal, sesi, statusLama, statusBaru: status, alasan: alasan.trim(), diubahOleh: req.user.id },
      { transaction: t }
    );
    await t.commit();
    res.status(200).json({ success: true, data: log, message: 'Data presensi berhasil diperbarui' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// GET /api/presensi/koreksi?userId=&tanggal= (fasil, admin) — riwayat perubahan
exports.riwayatKoreksi = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.tanggal) where.tanggal = req.query.tanggal;
    const data = await KoreksiPresensi.findAll({
      where,
      include: [
        { model: User, as: 'penghuni', attributes: ['id', 'name', 'asramaId'], where: scopeAsrama(req.user) },
        { model: User, as: 'pengubah', attributes: ['id', 'name', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
