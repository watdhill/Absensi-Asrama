const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Asrama } = require('../models');
const httpError = require('../utils/httpError');

// POST /api/auth/login — bisa pakai email atau NIM/NIP
exports.login = async (req, res, next) => {
  try {
    const { identifier, password, ingatSaya } = req.body;
    if (!identifier || !password) throw httpError(400, 'Email/NIM dan password wajib diisi');

    const user = await User.scope('withPassword').findOne({
      where: { [Op.or]: [{ email: identifier.trim().toLowerCase() }, { nomorInduk: identifier.trim() }] },
    });
    if (!user || !(await user.cekPassword(password))) {
      throw httpError(401, 'Email/NIM atau password salah');
    }
    if (user.status !== 'aktif') throw httpError(403, 'Akun Anda sudah dinonaktifkan');

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: ingatSaya ? '30d' : process.env.JWT_EXPIRES_IN || '1d',
    });
    const data = await User.findByPk(user.id, { include: Asrama });
    res.status(200).json({ success: true, data: { token, user: data } });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

// PUT /api/auth/profile — hanya data kontak yang boleh diubah sendiri
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, telepon } = req.body;
    await req.user.update({ name, email, telepon });
    res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { passwordLama, passwordBaru } = req.body;
    const user = await User.scope('withPassword').findByPk(req.user.id);
    if (!passwordLama || !(await user.cekPassword(passwordLama))) {
      throw httpError(400, 'Password lama salah');
    }
    user.password = passwordBaru;
    await user.save();
    res.status(200).json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    next(err);
  }
};
