const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Satu gedung asrama. Penghuni dan fasil terhubung ke asrama lewat asramaId.
const Asrama = sequelize.define(
  'Asrama',
  {
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { notEmpty: { msg: 'Nama asrama wajib diisi' } },
    },
    kode: {
      type: DataTypes.STRING(5),
      allowNull: false,
      unique: true, // awalan nomor kamar, misal "A" untuk kamar A-203
    },
    jenis: {
      type: DataTypes.ENUM('putra', 'putri'),
      allowNull: false,
    },
  },
  {
    tableName: 'Asrama',
    timestamps: true,
  }
);

module.exports = Asrama;
