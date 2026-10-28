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
| Admin | `admin@unand.ac.id` |

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
| GET | `/api/asrama` | semua | daftar gedung asrama |
| GET | `/api/dashboard` | fasil, admin | statistik dashboard |
| GET | `/api/notifikasi` | semua | notifikasi sesuai role |

## Catatan

- `sequelize.sync({ alter: true })` cocok untuk development. Untuk production,
  gunakan **Sequelize Migrations** (`sequelize-cli`).
- Data penghuni/fasil tidak pernah dihapus permanen, hanya dinonaktifkan.
