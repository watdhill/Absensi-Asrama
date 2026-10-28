const jwt = require('jsonwebtoken');
const { User, Asrama } = require('../models');
const httpError = require('../utils/httpError');

// Wajib login: membaca token "Bearer <jwt>" lalu menaruh user di req.user
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw httpError(401, 'Silakan login terlebih dahulu');

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw httpError(401, 'Sesi login sudah berakhir, silakan login ulang');
    }

    const user = await User.findByPk(payload.id, { include: Asrama });
    if (!user || user.status !== 'aktif') throw httpError(401, 'Akun tidak aktif');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Batasi endpoint untuk role tertentu, contoh: allow('fasil', 'admin')
exports.allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(httpError(403, 'Anda tidak memiliki akses ke halaman ini'));
  }
  next();
};
