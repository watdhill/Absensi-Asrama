const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Tanggal dari backend berupa 'YYYY-MM-DD'; diurai manual supaya tidak
// bergeser karena zona waktu browser.
const urai = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d };
};

// tanggal hari ini 'YYYY-MM-DD' dalam WIB
export const hariIniWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

export function tglPanjang(iso) {
  if (!iso) return '-';
  const { y, m, d } = urai(iso);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function tglPendek(iso) {
  if (!iso) return '-';
  const { y, m, d } = urai(iso);
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
}

export function hariTanggal(iso) {
  const { y, m, d } = urai(iso);
  return `${HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} ${BULAN[m - 1]} ${y}`;
}

export function rentangTgl(mulai, selesai) {
  if (!selesai || mulai === selesai) return tglPendek(mulai);
  const a = urai(mulai);
  const b = urai(selesai);
  const kiri = a.y === b.y ? `${a.d} ${BULAN[a.m - 1].slice(0, 3)}` : tglPendek(mulai);
  return `${kiri} – ${tglPendek(selesai)}`;
}

export function namaBulan(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

// timestamp (createdAt, reviewedAt) -> '23 Sep 2026, 05:32' dalam WIB
export function tglJam(ts) {
  if (!ts) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function waktuRelatif(ts) {
  if (!ts) return '';
  const detik = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  return `${Math.floor(detik / 86400)} hari lalu`;
}

export const koordinat = (lat, lng) => `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;

export const jamMenit =(jam) => (jam ? jam.slice(0, 5) : '-');

export function durasi(detik) {
  const s = Math.max(0, Math.floor(detik));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

export function ukuranFile(bytes) {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export const tipeFile = (mime = '') => (mime.includes('pdf') ? 'PDF' : mime.includes('png') ? 'PNG' : 'JPG');

export function inisial(nama = '') {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
}

export function sapaan(jam) {
  const h = Number(String(jam).slice(0, 2));
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export const SESI_LABEL = { pagi: 'Pagi', malam: 'Malam' };
export const ROLE_LABEL = { penghuni: 'Penghuni', fasil: 'Fasil', admin: 'Admin' };

// Semua status yang punya badge, dengan label & warnanya
export const STATUS = {
  hadir: { label: 'Hadir', tone: 'success', mark: '✓' },
  izin: { label: 'Izin', tone: 'info', mark: 'I' },
  tidak_hadir: { label: 'Tidak Hadir', tone: 'danger', mark: '×' },
  belum: { label: 'Belum Presensi', tone: 'muted', mark: '—' },
  menunggu: { label: 'Menunggu', tone: 'warning' },
  disetujui: { label: 'Disetujui', tone: 'success' },
  ditolak: { label: 'Ditolak', tone: 'danger' },
  aktif: { label: 'Aktif', tone: 'success' },
  nonaktif: { label: 'Tidak Aktif', tone: 'muted' },
};

export const JENIS_IZIN = ['Pulang Kampung', 'Keperluan Keluarga', 'Sakit', 'Kegiatan Kampus', 'Lainnya'];

// Program studi & fakultas UNAND untuk form penghuni
export const PRODI = {
  'Sistem Informasi': 'Teknologi Informasi',
  Informatika: 'Teknologi Informasi',
  'Teknik Komputer': 'Teknologi Informasi',
  'Teknik Sipil': 'Teknik',
  'Teknik Mesin': 'Teknik',
  'Teknik Elektro': 'Teknik',
  Agroteknologi: 'Pertanian',
  Kedokteran: 'Kedokteran',
  Farmasi: 'Farmasi',
  'Kesehatan Masyarakat': 'Kesehatan Masyarakat',
  Manajemen: 'Ekonomi dan Bisnis',
  Akuntansi: 'Ekonomi dan Bisnis',
  'Ilmu Hukum': 'Hukum',
};
