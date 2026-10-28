const { Op } = require('sequelize');
const { User, Izin, Presensi } = require('../models');
const SESI = require('../config/sesi');
const { sekarang, sesiAktif } = require('../utils/waktu');
const { muatStatus } = require('../utils/statusPresensi');

const SEMINGGU = 7 * 24 * 3600 * 1000;

// Notifikasi dihitung langsung dari data (tidak disimpan di tabel terpisah).
// Setiap item punya `link` ke halaman frontend yang relevan.
const builders = {
  async penghuni(user, now) {
    const list = [];
    const sesi = sesiAktif(now);
    if (sesi) {
      const sudah = await Presensi.findOne({ where: { userId: user.id, tanggal: now.tanggal, sesi } });
      if (!sudah) {
        list.push({
          id: `presensi-${sesi}`,
          jenis: 'peringatan',
          judul: 'Presensi belum dilakukan',
          pesan: `${SESI[sesi].label} dibuka sampai ${SESI[sesi].selesai} WIB`,
          link: '/presensi',
        });
      }
    }
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
