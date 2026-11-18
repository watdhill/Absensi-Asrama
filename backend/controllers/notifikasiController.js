const { Op } = require('sequelize');
const { User, Izin } = require('../models');
const SESI = require('../config/sesi');
const { SESI_KEYS, sekarang, sesiAktif, statusSesi } = require('../utils/waktu');
const { muatStatus } = require('../utils/statusPresensi');

const SEMINGGU = 7 * 24 * 3600 * 1000;

// Notifikasi dihitung langsung dari data (tidak disimpan di tabel terpisah).
// Setiap item punya `link` ke halaman frontend yang relevan.
// Pengingat presensi untuk penghuni yang belum presensi (dan tidak sedang izin):
// mulai 30 menit sebelum sesi dibuka, selama sesi dibuka, dan lebih mendesak
// saat sisa waktunya 15 menit atau kurang.
const PENGINGAT_SEBELUM = 30 * 60;
const HAMPIR_DITUTUP = 15 * 60;

async function pengingatPresensi(user, now) {
  const lookup = await muatStatus([user.id], now.tanggal, now.tanggal, now);
  const list = [];
  for (const sesi of SESI_KEYS) {
    if (lookup(user.id, now.tanggal, sesi).status !== 'belum') continue;
    const { label, mulai, selesai, mulaiDetik, selesaiDetik } = SESI[sesi];
    const state = statusSesi(sesi, now);

    if (state === 'dibuka') {
      const sisa = selesaiDetik - now.detik;
      const mendesak = sisa <= HAMPIR_DITUTUP;
      list.push({
        id: `pengingat-${sesi}`,
        jenis: mendesak ? 'bahaya' : 'peringatan',
        judul: mendesak ? 'Segera presensi! Sesi hampir ditutup' : 'Jangan lupa presensi',
        pesan: `${label} dibuka sampai ${selesai} WIB • sisa ${Math.ceil(sisa / 60)} menit`,
        link: '/presensi',
      });
    } else if (state === 'belum_dibuka' && mulaiDetik - now.detik <= PENGINGAT_SEBELUM) {
      list.push({
        id: `pengingat-${sesi}`,
        jenis: 'info',
        judul: 'Presensi segera dibuka',
        pesan: `${label} dibuka pukul ${mulai} WIB. Jangan lupa presensi ya!`,
        link: '/presensi',
      });
    }
  }
  return list;
}

const builders = {
  async penghuni(user, now) {
    const list = await pengingatPresensi(user, now);
    const diputuskan = await Izin.findAll({
      where: { userId: user.id, status: { [Op.ne]: 'menunggu' }, reviewedAt: { [Op.gte]: new Date(Date.now() - SEMINGGU) } },
      order: [['reviewedAt', 'DESC']],
    });
    for (const izin of diputuskan) {
      const ok = izin.status === 'disetujui';
      list.push({
        id: `izin-${izin.id}`,
        jenis: ok ? 'sukses' : 'bahaya',
        judul: ok ? 'Pengajuan izin disetujui' : 'Pengajuan izin ditolak',
        pesan: `${izin.jenis} • ${izin.tanggalMulai}`,
        waktu: izin.reviewedAt,
        link: `/perizinan/${izin.id}`,
      });
    }
    return list;
  },

  async fasil(user, now) {
    const scope = user.asramaId ? { asramaId: user.asramaId } : {};
    const list = [];
    const menunggu = await Izin.findAll({
      where: { status: 'menunggu' },
      include: { model: User, as: 'penghuni', attributes: ['name', 'kamar'], where: scope },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });
    for (const izin of menunggu) {
      list.push({
        id: `izin-${izin.id}`,
        jenis: 'info',
        judul: 'Pengajuan izin baru',
        pesan: `${izin.penghuni.name} (${izin.penghuni.kamar}) • ${izin.jenis}`,
        waktu: izin.createdAt,
        link: `/perizinan/${izin.id}`,
      });
    }
    const sesi = sesiAktif(now);
    if (sesi) {
      const penghuni = await User.findAll({
        where: { role: 'penghuni', status: 'aktif', tanggalMasuk: { [Op.lte]: now.tanggal }, ...scope },
        attributes: ['id'],
      });
      const lookup = await muatStatus(penghuni.map((p) => p.id), now.tanggal, now.tanggal, now);
      const belum = penghuni.filter((p) => lookup(p.id, now.tanggal, sesi).status === 'belum').length;
      if (belum) {
        list.unshift({
          id: `belum-${sesi}`,
          jenis: 'peringatan',
          judul: 'Penghuni belum melakukan presensi',
          pesan: `${belum} penghuni belum ${SESI[sesi].label.toLowerCase()}`,
          link: '/data-presensi',
        });
      }
    }
    return list;
  },

  async admin() {
    const baru = await User.findAll({
      where: { role: { [Op.in]: ['penghuni', 'fasil'] }, createdAt: { [Op.gte]: new Date(Date.now() - SEMINGGU) } },
      order: [['createdAt', 'DESC']],
      limit: 8,
    });
    return baru.map((u) => ({
      id: `user-${u.id}`,
      jenis: 'info',
      judul: u.role === 'penghuni' ? 'Penghuni baru' : 'Fasil baru',
      pesan: `${u.name}${u.kamar ? ` • Kamar ${u.kamar}` : ''}`,
      waktu: u.createdAt,
      link: u.role === 'penghuni' ? '/penghuni' : '/fasil',
    }));
  },
};

// GET /api/notifikasi
exports.list = async (req, res, next) => {
  try {
    const data = await builders[req.user.role](req.user, sekarang());
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
