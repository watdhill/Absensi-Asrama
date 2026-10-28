// Mengisi database dengan data contoh. PERINGATAN: semua tabel dikosongkan dulu.
// Jalankan: npm run seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { sequelize, Asrama, User, Presensi, Izin } = require('../models');
const SESI = require('../config/sesi');
const { SESI_KEYS, sekarang, statusSesi, geserTanggal, rentangTanggal } = require('../utils/waktu');
const { UPLOAD_DIR } = require('../middlewares/upload');

const PASSWORD = 'password123';
const HARI_RIWAYAT = 21;

// random yang hasilnya selalu sama setiap seed dijalankan
let seedAcak = 42;
const acak = () => {
  seedAcak = (seedAcak * 1103515245 + 12345) % 2147483648;
  return seedAcak / 2147483648;
};

const PENGHUNI = [
  ['2311523012', 'Rahil Akram', 'L', 'Sistem Informasi', 'Teknologi Informasi', 'A', 'A-203'],
  ['2311522004', 'Ahmad Fauzan', 'L', 'Informatika', 'Teknologi Informasi', 'A', 'A-102'],
  ['2210611023', 'Muhammad Rizki', 'L', 'Teknik Sipil', 'Teknik', 'A', 'A-102'],
  ['2210211045', 'Fikri Hidayat', 'L', 'Agroteknologi', 'Pertanian', 'A', 'A-105'],
  ['2311531017', 'Dimas Pratama', 'L', 'Teknik Komputer', 'Teknologi Informasi', 'A', 'A-203'],
  ['2210521030', 'Andi Kurniawan', 'L', 'Manajemen', 'Ekonomi dan Bisnis', 'A', 'A-207'],
  ['2311111008', 'Yoga Permana', 'L', 'Kedokteran', 'Kedokteran', 'B', 'B-110'],
  ['2210012041', 'Rafi Ananda', 'L', 'Ilmu Hukum', 'Hukum', 'B', 'B-110'],
  ['2311012019', 'Nadia Putri', 'P', 'Farmasi', 'Farmasi', 'C', 'C-301'],
  ['2210422027', 'Aulia Rahma', 'P', 'Akuntansi', 'Ekonomi dan Bisnis', 'C', 'C-301'],
  ['2311521033', 'Salsabila Zahra', 'P', 'Sistem Informasi', 'Teknologi Informasi', 'C', 'C-304'],
  ['2210312011', 'Intan Permata Sari', 'P', 'Kesehatan Masyarakat', 'Kesehatan Masyarakat', 'C', 'C-308'],
];

// ---- file bukti contoh -------------------------------------------------

function buatPdf(baris) {
  const teks = baris
    .map((t, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 60 ${760 - i * 24} Td (${t.replace(/[()\\]/g, '')}) Tj ET`)
    .join('\n');
  const objek = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(teks)} >>\nstream\n${teks}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let isi = '%PDF-1.4\n';
  const offset = [];
  objek.forEach((o, i) => {
    offset.push(Buffer.byteLength(isi));
    isi += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(isi);
  isi += `xref\n0 ${objek.length + 1}\n0000000000 65535 f \n`;
  isi += offset.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  isi += `trailer\n<< /Size ${objek.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(isi);
}

// PNG sederhana berupa "kertas" dengan garis-garis, sebagai contoh bukti foto
function buatPng(lebar = 480, tinggi = 320) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((lebar * 3 + 1) * tinggi);
  for (let y = 0; y < tinggi; y++) {
    raw[y * (lebar * 3 + 1)] = 0;
    for (let x = 0; x < lebar; x++) {
      const kertas = x > 40 && x < lebar - 40 && y > 24 && y < tinggi - 24;
      const garis = kertas && y > 60 && y % 28 < 6 && x < lebar - 40 - ((y * 7) % 120);
      const kepala = kertas && y > 34 && y < 50 && x < 260;
      const [r, g, b] = !kertas ? [18, 59, 102] : kepala ? [30, 90, 145] : garis ? [208, 213, 221] : [255, 255, 255];
      const i = y * (lebar * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lebar, 0);
  ihdr.writeUInt32BE(tinggi, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function simpanBukti(nama, buffer, tipe) {
  const file = `seed-${nama}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buffer);
  return { buktiFile: file, buktiNama: nama, buktiTipe: tipe, buktiUkuran: buffer.length };
}

// ---- seed -------------------------------------------------------------

const detikKeJam = (d) =>
  [Math.floor(d / 3600), Math.floor((d % 3600) / 60), d % 60].map((n) => String(n).padStart(2, '0')).join(':');

async function seed() {
  const now = sekarang();
  const awal = geserTanggal(now.tanggal, -HARI_RIWAYAT);

  // tabel contoh lama (Users & Tasks) dari template awal ikut dibersihkan
  await sequelize.query('DROP TABLE IF EXISTS "Tasks" CASCADE');
  await sequelize.sync({ force: true });
  // foto presensi lama ikut dihapus karena tabel Presensi dikosongkan
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (f.startsWith('seed-') || f.startsWith('presensi-')) fs.rmSync(path.join(UPLOAD_DIR, f));
  }

  const asrama = {};
  for (const [kode, nama, jenis] of [
    ['A', 'Asrama Putra A', 'putra'],
    ['B', 'Asrama Putra B', 'putra'],
    ['C', 'Asrama Putri C', 'putri'],
  ]) {
    asrama[kode] = await Asrama.create({ kode, nama, jenis });
  }

  await User.create({ name: 'Admin Asrama', email: 'admin@unand.ac.id', password: PASSWORD, role: 'admin', nomorInduk: 'ADM001' });

  const fasil = {};
  for (const [kode, nip, name, email, telepon] of [
    ['A', '198805122015041001', 'Hendra Saputra', 'hendra.fasil@unand.ac.id', '081266001122'],
    ['B', '199002182018031002', 'Rudi Hartono', 'rudi.fasil@unand.ac.id', '081374002233'],
    ['C', '199106252019032001', 'Siti Rahmawati', 'siti.fasil@unand.ac.id', '085263003344'],
  ]) {
    fasil[kode] = await User.create({ name, email, password: PASSWORD, role: 'fasil', nomorInduk: nip, telepon, asramaId: asrama[kode].id });
  }

  const penghuni = {};
  for (const [nim, name, jk, prodi, fakultas, kode, kamar] of PENGHUNI) {
    const depan = name.split(' ')[0].toLowerCase();
    penghuni[name] = await User.create({
      name,
      email: `${depan}.${nim}@student.unand.ac.id`,
      password: PASSWORD,
      role: 'penghuni',
      nomorInduk: nim,
      jenisKelamin: jk,
      prodi,
      fakultas,
      kamar,
      asramaId: asrama[kode].id,
      telepon: `08${Math.floor(1e9 + acak() * 8e9)}`,
      tanggalMasuk: awal,
    });
  }

  // ---- izin ----
  const pdf = (judul, nama) => buatPdf([judul, 'Universitas Andalas', '', `Yang bertanda tangan di bawah ini menerangkan bahwa ${nama}`, 'benar memerlukan izin meninggalkan asrama pada tanggal tersebut.', '', 'Padang, ' + now.tanggal]);
  const izinData = [
    // izin disetujui di masa lalu -> presensinya tercatat "Izin"
    { nama: 'Rahil Akram', jenis: 'Sakit', mulai: -6, selesai: -5, alasan: 'Demam dan dirawat di klinik kampus', status: 'disetujui', bukti: ['surat-dokter-rahil.pdf', 'pdf'] },
    { nama: 'Rahil Akram', jenis: 'Kegiatan Kampus', mulai: 3, selesai: 4, alasan: 'Mengikuti lomba karya tulis ilmiah tingkat nasional di Bukittinggi', status: 'menunggu', bukti: ['surat-tugas-lomba.pdf', 'pdf'] },
    { nama: 'Ahmad Fauzan', jenis: 'Keperluan Keluarga', mulai: 0, selesai: 1, alasan: 'Keperluan keluarga, menghadiri pernikahan kakak di Payakumbuh', status: 'menunggu', bukti: ['undangan-pernikahan.png', 'png'] },
    { nama: 'Muhammad Rizki', jenis: 'Pulang Kampung', mulai: 1, selesai: 3, alasan: 'Pulang kampung ke Solok karena orang tua sakit', status: 'menunggu', bukti: ['surat-keterangan-keluarga.pdf', 'pdf'] },
    { nama: 'Dimas Pratama', jenis: 'Kegiatan Kampus', mulai: -3, selesai: -3, alasan: 'Kunjungan industri bersama himpunan', status: 'disetujui', bukti: ['surat-kunjungan.pdf', 'pdf'] },
    { nama: 'Nadia Putri', jenis: 'Keperluan Keluarga', mulai: -2, selesai: -1, alasan: 'Menjemput keluarga di bandara', status: 'ditolak', alasanPenolakan: 'Bukti tidak sesuai, mohon lampirkan surat keterangan dari orang tua.', bukti: ['bukti-tiket.png', 'png'] },
    { nama: 'Aulia Rahma', jenis: 'Sakit', mulai: 0, selesai: 0, alasan: 'Sakit gigi, kontrol ke RSGM', status: 'menunggu', bukti: ['surat-rsgm.pdf', 'pdf'] },
  ];
  for (const d of izinData) {
    const user = penghuni[d.nama];
    const reviewer = Object.values(fasil).find((f) => f.asramaId === user.asramaId);
    const [namaFile, tipe] = d.bukti;
    const buffer = tipe === 'pdf' ? pdf('Surat Keterangan ' + d.jenis, d.nama) : buatPng();
    await Izin.create({
      userId: user.id,
      jenis: d.jenis,
      tanggalMulai: geserTanggal(now.tanggal, d.mulai),
      tanggalSelesai: geserTanggal(now.tanggal, d.selesai),
      alasan: d.alasan,
      status: d.status,
      alasanPenolakan: d.alasanPenolakan,
      reviewedBy: d.status === 'menunggu' ? null : reviewer.id,
      reviewedAt: d.status === 'menunggu' ? null : new Date(Date.now() - 86400000),
      ...simpanBukti(namaFile, buffer, tipe === 'pdf' ? 'application/pdf' : 'image/png'),
    });
  }

  // ---- presensi ----
  const izinDisetujui = izinData.filter((d) => d.status === 'disetujui');
  const rows = [];
  for (const [name, user] of Object.entries(penghuni)) {
    for (const tanggal of rentangTanggal(awal, now.tanggal)) {
      for (const sesi of SESI_KEYS) {
        const hariIni = tanggal === now.tanggal;
        if (hariIni && statusSesi(sesi, now) === 'belum_dibuka') continue;
        // Rahil dibiarkan belum presensi di sesi yang sedang dibuka, untuk dicoba
        if (hariIni && name === 'Rahil Akram' && statusSesi(sesi, now) === 'dibuka') continue;
        const izin = izinDisetujui.some(
          (d) => d.nama === name && tanggal >= geserTanggal(now.tanggal, d.mulai) && tanggal <= geserTanggal(now.tanggal, d.selesai)
        );
        if (izin || acak() < (hariIni ? 0.25 : 0.08)) continue; // sisanya jadi "tidak hadir"/"belum"

        const { mulaiDetik, selesaiDetik } = SESI[sesi];
        const batas = hariIni && statusSesi(sesi, now) === 'dibuka' ? now.detik : selesaiDetik;
        rows.push({
          userId: user.id,
          tanggal,
          sesi,
          status: 'hadir',
          waktu: detikKeJam(Math.floor(mulaiDetik + acak() * (batas - mulaiDetik))),
        });
      }
    }
  }
  await Presensi.bulkCreate(rows);

  console.log(`Seed selesai: ${PENGHUNI.length} penghuni, 3 fasil, 1 admin, ${rows.length} presensi, ${izinData.length} izin.`);
  console.log(`Password semua akun: ${PASSWORD}`);
  console.log('  Penghuni : 2311523012 (Rahil Akram)');
  console.log('  Fasil    : hendra.fasil@unand.ac.id (Asrama Putra A)');
  console.log('  Admin    : admin@unand.ac.id');
}

seed()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error('Seed gagal:', err);
    await sequelize.close();
    process.exit(1);
  });
