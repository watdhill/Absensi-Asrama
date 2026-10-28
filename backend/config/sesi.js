// Jadwal sesi presensi (WIB). Bisa diubah lewat .env, misalnya untuk demo
// di luar jam asli: SESI_PAGI=08:00-23:59
const toDetik = (jam) => {
  const [h, m] = jam.split(':').map(Number);
  return h * 3600 + m * 60;
};

const parse = (range) => {
  const [mulai, selesai] = range.split('-');
  return { mulai, selesai, mulaiDetik: toDetik(mulai), selesaiDetik: toDetik(selesai) };
};

module.exports = {
  pagi: { label: 'Presensi Pagi', ...parse(process.env.SESI_PAGI || '04:00-06:00') },
  malam: { label: 'Presensi Malam', ...parse(process.env.SESI_MALAM || '18:00-20:30') },
};
