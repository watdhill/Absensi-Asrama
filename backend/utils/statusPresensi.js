const { Op } = require('sequelize');
const { Presensi, Izin } = require('../models');
const { SESI_KEYS, sekarang, statusSesi, rentangTanggal } = require('./waktu');

// Status presensi yang ditampilkan ke pengguna:
//   hadir | izin | tidak_hadir  -> tersimpan di tabel Presensi, atau
//   izin                        -> ada izin disetujui yang mencakup tanggal itu
//   tidak_hadir                 -> tidak ada data & sesinya sudah lewat
//   belum                       -> tidak ada data & sesinya belum lewat
function hitungStatus({ record, adaIzin, tanggal, sesi, now }) {
  if (record) return record.status;
  if (adaIzin) return 'izin';
  if (tanggal < now.tanggal) return 'tidak_hadir';
  if (tanggal > now.tanggal) return 'belum';
  return statusSesi(sesi, now) === 'berakhir' ? 'tidak_hadir' : 'belum';
}

// Ambil data presensi & izin disetujui untuk sekumpulan penghuni dalam rentang
// tanggal, lalu kembalikan fungsi lookup status per (userId, tanggal, sesi).
async function muatStatus(userIds, dari, sampai, now = sekarang()) {
  const [records, izins] = await Promise.all([
    Presensi.findAll({
      where: { userId: userIds, tanggal: { [Op.between]: [dari, sampai] } },
    }),
    Izin.findAll({
      where: {
        userId: userIds,
        status: 'disetujui',
        tanggalMulai: { [Op.lte]: sampai },
        tanggalSelesai: { [Op.gte]: dari },
      },
    }),
  ]);

  const byKey = new Map(records.map((r) => [`${r.userId}|${r.tanggal}|${r.sesi}`, r]));

  return (userId, tanggal, sesi) => {
    const record = byKey.get(`${userId}|${tanggal}|${sesi}`);
    const adaIzin = izins.some(
      (i) => i.userId === userId && i.tanggalMulai <= tanggal && i.tanggalSelesai >= tanggal
    );
    return {
      status: hitungStatus({ record, adaIzin, tanggal, sesi, now }),
      waktu: record ? record.waktu : null,
      presensiId: record ? record.id : null,
      adaFoto: Boolean(record?.foto),
      latitude: record?.latitude ?? null,
      longitude: record?.longitude ?? null,
      akurasi: record?.akurasi ?? null,
    };
  };
}

// Riwayat presensi satu penghuni (terbaru di atas), dimulai dari tanggal masuknya.
async function riwayatPenghuni(user, dari, sampai, now = sekarang()) {
  const mulai = dari < user.tanggalMasuk ? user.tanggalMasuk : dari;
  const akhir = sampai > now.tanggal ? now.tanggal : sampai;
  if (mulai > akhir) return [];

  const lookup = await muatStatus([user.id], mulai, akhir, now);
  const hasil = [];
  for (const tanggal of rentangTanggal(mulai, akhir).reverse()) {
    for (const sesi of [...SESI_KEYS].reverse()) {
      const item = { tanggal, sesi, ...lookup(user.id, tanggal, sesi) };
      // sesi hari ini yang belum dimulai tidak perlu ditampilkan
      if (tanggal === now.tanggal && statusSesi(sesi, now) === 'belum_dibuka') continue;
      hasil.push(item);
    }
  }
  return hasil;
}

module.exports = { hitungStatus, muatStatus, riwayatPenghuni };
