const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

// Satu tabel untuk ketiga role. Kolom yang tidak relevan untuk suatu role
// (misal kamar untuk admin) dibiarkan null.
const User = sequelize.define(
  'User',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Nama wajib diisi' } },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: 'Email sudah terdaftar' },
      validate: { isEmail: { msg: 'Format email tidak valid' } },
      set(value) {
        this.setDataValue('email', typeof value === 'string' ? value.trim().toLowerCase() : value);
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: { args: [6, 100], msg: 'Password minimal 6 karakter' } },
    },
    role: {
      type: DataTypes.ENUM('penghuni', 'fasil', 'admin'),
      allowNull: false,
    },
    // NIM untuk penghuni, NIP / ID Fasil untuk fasil
    nomorInduk: {
      type: DataTypes.STRING,
      unique: { msg: 'NIM / NIP sudah terdaftar' },
    },
    jenisKelamin: DataTypes.ENUM('L', 'P'),
    prodi: DataTypes.STRING,
    fakultas: DataTypes.STRING,
    kamar: DataTypes.STRING,
    telepon: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      defaultValue: 'aktif',
    },
    // presensi dihitung mulai tanggal ini, supaya hari sebelum penghuni
    // terdaftar tidak dianggap "tidak hadir"
    tanggalMasuk: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: { include: ['password'] } } },
    hooks: {
      // password selalu disimpan dalam bentuk hash
      beforeSave: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

User.prototype.cekPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
