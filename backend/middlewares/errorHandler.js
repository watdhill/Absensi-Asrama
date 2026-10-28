const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan pada server';

  // error validasi Sequelize -> 400 dengan pesan validasi pertama
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = err.name === 'SequelizeUniqueConstraintError' ? 409 : 400;
    message = err.errors?.[0]?.message || message;
  }
  // misal /api/izin/abc -> id bukan angka
  if (err.name === 'SequelizeDatabaseError' && /invalid input syntax/.test(err.message)) {
    statusCode = 400;
    message = 'Parameter tidak valid';
  }
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file maksimal 5 MB' : message;
  }

  if (statusCode >= 500) console.error(err.stack);
  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
