const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Jejak audit setiap kali fasil mengubah status presensi secara manual.
const KoreksiPresensi = sequelize.define(
  'KoreksiPresensi',
  {
    tanggal: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    sesi: {
      type: DataTypes.ENUM('pagi', 'malam'),
      allowNull: false,
    },
    statusLama: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    statusBaru: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    alasan: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: { msg: 'Alasan perubahan wajib diisi' } },
    },
  },
  {
    tableName: 'KoreksiPresensi',
    timestamps: true,
  }
);

module.exports = KoreksiPresensi;
