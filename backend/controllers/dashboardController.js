const { Op } = require('sequelize');
const { User, Asrama, Izin } = require('../models');
const SESI = require('../config/sesi');
const { SESI_KEYS, sekarang, statusSesi, sesiAcuan } = require('../utils/waktu');
const { muatStatus } = require('../utils/statusPresensi');

// Rekap presensi hari ini untuk sekumpulan penghuni
async function rekapHariIni(penghuni, now) {
  const lookup = await muatStatus(penghuni.map((p) => p.id), now.tanggal, now.tanggal, now);
  const sesi = SESI_KEYS.map((key) => {
    const statuses = penghuni.map((p) => lookup(p.id, now.tanggal, key).status);
    return {
      sesi: key,
      label: SESI[key].label,
      mulai: SESI[key].mulai,
      selesai: SESI[key].selesai,
      state: statusSesi(key, now),
      total: penghuni.length,
      hadir: statuses.filter((s) => s === 'hadir').length,
      izin: statuses.filter((s) => s === 'izin').length,
    };
  });

  const acuan = sesiAcuan(now);
  const belumPresensi = acuan
    ? penghuni
        .map((p) => ({ penghuni: p, sesi: acuan, status: lookup(p.id, now.tanggal, acuan).status }))
        .filter((r) => r.status === 'belum' || r.status === 'tidak_hadir')
    : [];

  return { sesi, sesiAcuan: acuan, belumPresensi };
}

// GET /api/dashboard (fasil, admin)
exports.dashboard = async (req, res, next) => {
  try {
    const now = sekarang();
    const scope = req.user.role === 'fasil' && req.user.asramaId ? { asramaId: req.user.asramaId } : {};

    const penghuni = await User.findAll({
      where: { role: 'penghuni', status: 'aktif', tanggalMasuk: { [Op.lte]: now.tanggal }, ...scope },
      include: { model: Asrama, attributes: ['id', 'nama'] },
      order: [['kamar', 'ASC']],
    });
    const rekap = await rekapHariIni(penghuni, now);
    const acuan = rekap.sesi.find((s) => s.sesi === rekap.sesiAcuan);

    const izinMenunggu = await Izin.count({
      where: { status: 'menunggu' },
      include: { model: User, as: 'penghuni', where: scope },
    });

    const data = {
      tanggal: now.tanggal,
      totalPenghuni: penghuni.length,
      hadirHariIni: acuan ? acuan.hadir : 0,
      izinMenunggu,
      ...rekap,
      belumPresensi: rekap.belumPresensi.slice(0, 8),
      jumlahBelumPresensi: rekap.belumPresensi.length,
    };

    if (req.user.role === 'admin') {
      const [totalFasil, totalAsrama] = await Promise.all([
        User.count({ where: { role: 'fasil', status: 'aktif' } }),
        Asrama.count(),
      ]);
      Object.assign(data, { totalFasil, totalAsrama });
    }

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
