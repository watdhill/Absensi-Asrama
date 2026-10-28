const sequelize = require('../config/database');
const Asrama = require('./Asrama');
const User = require('./User');
const Presensi = require('./Presensi');
const KoreksiPresensi = require('./KoreksiPresensi');
const Izin = require('./Izin');

// RELASI antar tabel (setara foreign key di SQL)

// penghuni & fasil terdaftar di satu asrama
Asrama.hasMany(User, { foreignKey: 'asramaId' });
User.belongsTo(Asrama, { foreignKey: 'asramaId' });

// 1 penghuni punya banyak presensi
User.hasMany(Presensi, { foreignKey: 'userId', onDelete: 'CASCADE' });
Presensi.belongsTo(User, { foreignKey: 'userId' });

// riwayat koreksi: siapa penghuninya, dan fasil mana yang mengubah
KoreksiPresensi.belongsTo(User, { as: 'penghuni', foreignKey: 'userId', onDelete: 'CASCADE' });
KoreksiPresensi.belongsTo(User, { as: 'pengubah', foreignKey: 'diubahOleh' });

// izin diajukan oleh penghuni dan diputuskan oleh fasil
User.hasMany(Izin, { foreignKey: 'userId', onDelete: 'CASCADE' });
Izin.belongsTo(User, { as: 'penghuni', foreignKey: 'userId' });
Izin.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewedBy' });

module.exports = { sequelize, Asrama, User, Presensi, KoreksiPresensi, Izin };
