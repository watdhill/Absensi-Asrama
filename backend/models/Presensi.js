const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Satu baris = satu penghuni, satu tanggal, satu sesi.
// Kalau baris belum ada, statusnya dihitung di utils/statusPresensi.js
// (belum presensi / tidak hadir / izin).
const Presensi = sequelize.define(
  'Presensi',
  {
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    sesi: {
      type: DataTypes.ENUM('pagi', 'malam'),
      allowNull: false,
    },
    waktu: DataTypes.TIME, // jam presensi, null kalau status diisi lewat koreksi
    status: {
      type: DataTypes.ENUM('hadir', 'izin', 'tidak_hadir'),
      allowNull: false,
    },
    // bukti presensi dari kamera & GPS penghuni. Null untuk data hasil koreksi.
    foto: DataTypes.STRING, // nama file di folder uploads/
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,
    akurasi: DataTypes.DOUBLE, // radius akurasi GPS dalam meter
  },
  {
    tableName: 'Presensi',
    timestamps: true,
    // mencegah presensi dobel untuk sesi yang sama
    indexes: [{ unique: true, fields: ['userId', 'tanggal', 'sesi'] }],
  }
);

module.exports = Presensi;
