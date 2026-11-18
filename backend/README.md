# Backend — Sistem Absensi Penghuni Asrama UNAND

REST API Express + Sequelize + PostgreSQL dengan pola MVC. Melayani tiga role:
**Penghuni**, **Fasil**, dan **Admin**.

## Struktur

```
config/       koneksi database & jadwal sesi presensi
models/       Asrama, User, Presensi, KoreksiPresensi, Izin (+ relasi di index.js)
controllers/  logika tiap endpoint
routes/       definisi URL -> controller
middlewares/  auth (JWT + role), upload bukti (multer), error handler
utils/        waktu WIB, perhitungan status presensi
seeders/      data contoh (npm run seed)
uploads/      file bukti izin (tidak ikut di git)
```

## Instalasi

1. Install PostgreSQL, lalu buat database:
   ```sql
   CREATE DATABASE mvc_backend_db;
   ```
2. Install dependency:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env`, isi `DB_PASSWORD` dan ganti `JWT_SECRET`
   dengan string acak panjang.
4. Isi data contoh (**mengosongkan semua tabel**):
   ```bash
   npm run seed
   ```
5. Jalankan server:
   ```bash
   npm run dev   # http://localhost:5000
   ```

Akun hasil seed, semua dengan password `password123`:

| Role | Login |
|---|---|
| Penghuni | `2311523012` (NIM) atau emailnya |
| Fasil Asrama Putra A | `hendra.fasil@unand.ac.id` |
| Fasil Asrama Putri C | `siti.fasil@unand.ac.id` |
| Fasil gedung lain | `rudi` (B), `dewi` (D), `rina` (E), `yuliana` (F), `andre` (Internasional) + `.fasil@unand.ac.id` |
| Admin | `admin@unand.ac.id` |

## Gedung & kamar

- 7 gedung: 2 putra (A, B), 4 putri (C–F), 1 internasional (I). Admin bisa
  menambah/mengubah/menghapus gedung di menu **Gedung & Kamar**.
- Gedung putra hanya untuk penghuni laki-laki, putri untuk perempuan;
  internasional menerima keduanya, tetapi **satu kamar satu jenis kelamin**.
- Kamar terdaftar di tabel `Kamar` (nomor diawali kode gedung, misal `A-203`),
  dengan kapasitas per kamar (default 4). Penghuni hanya bisa ditempatkan di
  kamar terdaftar yang belum penuh. Dicek saat tambah penghuni, pindah kamar,
  dan mengaktifkan kembali penghuni. Seeder membuat lantai 1–3 nomor 01–10.
- Kamar yang masih berpenghuni tidak bisa dihapus dan kapasitasnya tidak bisa
  diturunkan di bawah jumlah penghuni; gedung yang masih punya penghuni/fasil
  tidak bisa dihapus.

## Lokasi presensi (geofence)

- Setiap gedung punya titik `latitude`/`longitude` dan `radius` (meter). Penghuni
  hanya bisa presensi dalam radius gedungnya; akurasi GPS diberi toleransi
  maksimal 50 m. Jarak ke gedung disimpan di kolom `Presensi.jarak`.
- Gedung tanpa koordinat tidak dibatasi lokasi.
- Koordinat di seeder hanya **perkiraan** — atur titik sebenarnya di halaman
  detail gedung (tombol "Pakai lokasi saya" saat berada di gedung).
- Untuk tes dari luar asrama, isi `GEOFENCE=nonaktif` di `.env` lalu restart.

## Laporan

- Menu **Laporan** (fasil & admin): rekap bulanan per penghuni — hadir, izin,
  tidak hadir, persentase kehadiran (hadir ÷ total sesi tercatat). Penghuni di
  bawah 75% ditandai.
- Export Excel berisi sheet **Rekap** dan **Detail Harian** (H/I/T per tanggal
  & sesi); tombol **Cetak / PDF** memakai tampilan cetak browser.
- Fasil hanya melihat rekap gedungnya sendiri.

## Aturan presensi

- Sesi **pagi 04.00–06.00** dan **malam 18.00–20.30** WIB. Jamnya bisa diubah lewat
  `SESI_PAGI` / `SESI_MALAM` di `.env`, misalnya untuk demo di luar jam tersebut.
- Sesi ditentukan otomatis dari jam server; penghuni tidak memilih sesi.
- Satu penghuni hanya bisa presensi sekali per sesi (dicek di controller dan
  dijaga unique index di database).
- Status yang tidak tersimpan di tabel dihitung saat dibaca
  (`utils/statusPresensi.js`): ada izin disetujui → **Izin**, sesi sudah lewat →
  **Tidak Hadir**, selain itu **Belum Presensi**.
- Presensi wajib menyertakan foto dari kamera dan lokasi GPS. Jam, tanggal, dan
  sesi diambil dari server; frontend mencetak info tersebut beserta koordinat
  di bagian bawah foto.
- Penghuni yang belum presensi (dan tidak sedang izin) mendapat pengingat di
  notifikasi: 30 menit sebelum sesi dibuka, selama sesi dibuka (dengan sisa
  waktu), dan pengingat mendesak saat sisa 15 menit atau kurang
  (`controllers/notifikasiController.js`).
- Koreksi oleh fasil wajib menyertakan alasan dan dicatat di tabel `KoreksiPresensi`.
- Fasil hanya melihat dan mengoreksi penghuni di asramanya sendiri.

## Endpoint

Semua endpoint selain login membutuhkan header `Authorization: Bearer <token>`.

| Method | URL | Role | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | - | `{ identifier, password, ingatSaya }` |
| GET | `/api/auth/me` | semua | data user login |
| PUT | `/api/auth/profile` | semua | ubah nama, email, telepon |
| PUT | `/api/auth/password` | semua | `{ passwordLama, passwordBaru }` |
| GET | `/api/presensi/hari-ini` | penghuni | status kedua sesi hari ini |
| POST | `/api/presensi` | penghuni | multipart: `foto` (JPG/PNG dari kamera), `latitude`, `longitude`, `akurasi` — presensi pada sesi yang sedang dibuka |
| GET | `/api/presensi/:id/foto` | semua | foto presensi (penghuni pemilik, fasil asramanya, admin) |
| GET | `/api/presensi/saya?bulan=&sesi=&status=` | penghuni | riwayat + ringkasan |
| GET | `/api/presensi?tanggal=&sesi=&status=&asramaId=&kamar=&q=` | fasil, admin | data presensi per penghuni |
| PUT | `/api/presensi/koreksi` | fasil, admin | `{ userId, tanggal, sesi, status, alasan }` |
| GET | `/api/presensi/koreksi?userId=&tanggal=` | fasil, admin | riwayat koreksi |
| GET | `/api/izin?status=` | semua | daftar izin sesuai hak akses |
| GET | `/api/izin/:id` | semua | detail izin |
| GET | `/api/izin/:id/bukti` | semua | file bukti (JPG/PNG/PDF) |
| POST | `/api/izin` | penghuni | multipart: `jenis, tanggalMulai, tanggalSelesai, alasan, bukti` (maks 5 MB) |
| PUT | `/api/izin/:id/setujui` | fasil, admin | |
| PUT | `/api/izin/:id/tolak` | fasil, admin | `{ alasan }` wajib |
| GET/POST | `/api/penghuni` | admin | daftar (filter + paginasi) / tambah |
| GET/PUT | `/api/penghuni/:id` | admin | detail / ubah |
| PATCH | `/api/penghuni/:id/status` | admin | `{ status: 'aktif' \| 'nonaktif' }` |
| * | `/api/fasil...` | admin | sama seperti `/api/penghuni` |
| GET | `/api/asrama` | semua | daftar gedung + jumlah penghuni, kamar, kapasitas |
| GET | `/api/asrama/:id` | semua | detail gedung |
| POST | `/api/asrama` | admin | `{ nama, kode, jenis, latitude, longitude, radius }` |
| PUT/DELETE | `/api/asrama/:id` | admin | ubah / hapus gedung (kosong) |
| GET | `/api/asrama/:id/kamar` | admin | semua kamar + penghuninya |
| POST | `/api/asrama/:id/kamar` | admin | `{ nomor, lantai, kapasitas }` atau massal `{ lantaiDari, lantaiSampai, nomorDari, nomorSampai, kapasitas }` |
| PUT/DELETE | `/api/kamar/:id` | admin | ubah kapasitas/lantai, hapus kamar kosong |
| GET | `/api/laporan/rekap?bulan=&asramaId=` | fasil, admin | rekap kehadiran bulanan |
| GET | `/api/laporan/rekap/excel?bulan=&asramaId=` | fasil, admin | file Excel rekap |
| GET | `/api/dashboard` | fasil, admin | statistik dashboard |
| GET | `/api/notifikasi` | semua | notifikasi sesuai role |

## Catatan

- `sequelize.sync({ alter: true })` cocok untuk development. Untuk production,
  gunakan **Sequelize Migrations** (`sequelize-cli`).
- Data penghuni/fasil tidak pernah dihapus permanen, hanya dinonaktifkan.
