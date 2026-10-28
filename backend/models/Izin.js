const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Izin = sequelize.define(
  'Izin',
  {
    jenis: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Jenis izin wajib diisi' } },
    },
    tanggalMulai: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tanggalSelesai: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    alasan: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: { msg: 'Alasan wajib diisi' } },
    },
    // file bukti disimpan di folder uploads/, di sini hanya metadatanya
    buktiFile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    buktiNama: DataTypes.STRING,
    buktiTipe: DataTypes.STRING,
    buktiUkuran: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('menunggu', 'disetujui', 'ditolak'),
      defaultValue: 'menunggu',
    },
    alasanPenolakan: DataTypes.TEXT,
    reviewedAt: DataTypes.DATE,
  },
  {
    tableName: 'Izin',
    timestamps: true,
    validate: {
      rentangTanggal() {
        if (this.tanggalSelesai < this.tanggalMulai) {
          throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
        }
      },
    },
  }
);

module.exports = Izin;
