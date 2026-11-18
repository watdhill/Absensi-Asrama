const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Kamar terdaftar di satu gedung. Penghuni hanya bisa ditempatkan di kamar
// yang terdaftar; kolom User.kamar menyimpan nomor kamarnya (misal "A-203").
const Kamar = sequelize.define(
  'Kamar',
  {
    nomor: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Nomor kamar wajib diisi' } },
    },
    lantai: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: { args: [1], msg: 'Lantai minimal 1' } },
    },
    kapasitas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      validate: {
        min: { args: [1], msg: 'Kapasitas minimal 1 penghuni' },
        max: { args: [12], msg: 'Kapasitas maksimal 12 penghuni' },
      },
    },
  },
  {
    tableName: 'Kamar',
    timestamps: true,
    indexes: [{ unique: true, fields: ['asramaId', 'nomor'] }],
  }
);

module.exports = Kamar;
