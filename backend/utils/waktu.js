const SESI = require('../config/sesi');

const TZ = 'Asia/Jakarta';
const SESI_KEYS = ['pagi', 'malam'];

// Waktu sekarang dalam WIB, terlepas dari zona waktu komputer server.
function sekarang() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const h = Number(parts.hour);
  const m = Number(parts.minute);
  const s = Number(parts.second);
  return {
    tanggal: `${parts.year}-${parts.month}-${parts.day}`,
    jam: `${parts.hour}:${parts.minute}:${parts.second}`,
    detik: h * 3600 + m * 60 + s,
  };
}

// 'belum_dibuka' | 'dibuka' | 'berakhir' untuk sesi pada hari ini
function statusSesi(sesi, now = sekarang()) {
  const { mulaiDetik, selesaiDetik } = SESI[sesi];
  if (now.detik < mulaiDetik) return 'belum_dibuka';
  if (now.detik < selesaiDetik) return 'dibuka';
  return 'berakhir';
}

// Sesi yang sedang dibuka saat ini, atau null
function sesiAktif(now = sekarang()) {
  return SESI_KEYS.find((s) => statusSesi(s, now) === 'dibuka') || null;
}

// Sesi yang dipakai sebagai acuan monitoring: yang sedang dibuka,
// atau sesi terakhir yang sudah dimulai hari ini.
function sesiAcuan(now = sekarang()) {
  const mulai = SESI_KEYS.filter((s) => statusSesi(s, now) !== 'belum_dibuka');
  return mulai[mulai.length - 1] || null;
}

// Tambah/kurang hari pada string 'YYYY-MM-DD'
function geserTanggal(tanggal, hari) {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

function rentangTanggal(dari, sampai) {
  const hasil = [];
  for (let t = dari; t <= sampai; t = geserTanggal(t, 1)) hasil.push(t);
  return hasil;
}

module.exports = { SESI_KEYS, sekarang, statusSesi, sesiAktif, sesiAcuan, geserTanggal, rentangTanggal };
