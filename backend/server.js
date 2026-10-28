require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./models'); // sekaligus menjalankan asosiasi di models/index.js
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const presensiRoutes = require('./routes/presensiRoutes');
const izinRoutes = require('./routes/izinRoutes');
const akunRoutes = require('./routes/akunRoutes');
const umumRoutes = require('./routes/umumRoutes');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diisi di .env');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/presensi', presensiRoutes);
app.use('/api/izin', izinRoutes);
app.use('/api/penghuni', akunRoutes('penghuni'));
app.use('/api/fasil', akunRoutes('fasil'));
app.use('/api', umumRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API Sistem Absensi Penghuni Asrama UNAND berjalan' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// sequelize.sync() akan otomatis membuat tabel di database berdasarkan model
// (database-nya sendiri harus sudah dibuat manual dulu, lihat README).
// Untuk mengisi data contoh jalankan: npm run seed
sequelize
  .sync({ alter: true }) // { alter: true } cocok untuk development; hindari di production
  .then(() => {
    console.log('Koneksi PostgreSQL berhasil & tabel tersinkronisasi');
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Gagal konek ke database PostgreSQL:', error.message);
    process.exit(1);
  });
