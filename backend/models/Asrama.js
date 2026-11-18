const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Satu gedung asrama. Penghuni dan fasil terhubung ke asrama lewat asramaId.
const Asrama = sequelize.define(
  'Asrama',
  {
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: { msg: 'Nama gedung sudah dipakai' },
      validate: { notEmpty: { msg: 'Nama asrama wajib diisi' } },
    },
    kode: {
      type: DataTypes.STRING(5),
      allowNull: false,
      unique: { msg: 'Kode gedung sudah dipakai' }, // awalan nomor kamar, misal "A" untuk kamar A-203
    },
    // internasional menerima penghuni laki-laki & perempuan (satu kamar tetap satu jenis kelamin)
    jenis: {
      type: DataTypes.ENUM('putra', 'putri', 'internasional'),
      allowNull: false,
    },
    // titik pusat gedung untuk geofence presensi; kalau kosong, lokasi tidak dibatasi
    latitude: {
      type: DataTypes.DOUBLE,
      validate: { min: -90, max: 90 },
    },
    longitude: {
      type: DataTypes.DOUBLE,
      validate: { min: -180, max: 180 },
    },
    radius: {
      type: DataTypes.INTEGER, // meter
      allowNull: false,
      defaultValue: 200,
      validate: {
        min: { args: [20], msg: 'Radius minimal 20 meter' },
        max: { args: [5000], msg: 'Radius maksimal 5000 meter' },
      },
    },
  },
  {
    tableName: 'Asrama',
    timestamps: true,
  }
);

module.exports = Asrama;
