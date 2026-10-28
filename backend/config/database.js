const { Sequelize } = require('sequelize');

// Sama seperti versi MySQL, bedanya cuma dialect dan port default.
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // set true kalau mau lihat query SQL yang dijalankan di console
  }
);

module.exports = sequelize;
