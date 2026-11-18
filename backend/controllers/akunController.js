const { Op } = require('sequelize');
const { User, Asrama } = require('../models');
const httpError = require('../utils/httpError');
const { normalKamar, cekPenempatan } = require('../utils/kamar');

// Data Penghuni dan Data Fasil (admin) punya alur CRUD yang sama, bedanya
// hanya role dan kolom yang boleh diisi. Controller dibuat lewat factory ini.
const FIELDS = {
  penghuni: ['name', 'email', 'nomorInduk', 'jenisKelamin', 'prodi', 'fakultas', 'asramaId', 'kamar', 'telepon'],
  fasil: ['name', 'email', 'nomorInduk', 'telepon', 'asramaId'],
};
const LABEL = { penghuni: 'Penghuni', fasil: 'Fasil' };

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k] === '' ? null : obj[k]]));

module.exports = function akunController(role) {
  const cari = async (id) => {
    const user = await User.findOne({ where: { id, role }, include: Asrama });
    if (!user) throw httpError(404, `${LABEL[role]} tidak ditemukan`);
    return user;
  };

  return {
    // GET /?q=&asramaId=&kamar=&prodi=&status=&page=
    list: async (req, res, next) => {
      try {
        const { q, asramaId, kamar, prodi, status } = req.query;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Number(req.query.limit) || 10);

        const where = { role };
        if (q) {
          where[Op.or] = [
            { name: { [Op.iLike]: `%${q}%` } },
            { nomorInduk: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
          ];
        }
        if (asramaId) where.asramaId = asramaId;
        if (kamar) where.kamar = { [Op.iLike]: `%${kamar}%` };
        if (prodi) where.prodi = prodi;
        if (status) where.status = status;

        const { rows, count } = await User.findAndCountAll({
          where,
          include: Asrama,
          order: [['createdAt', 'DESC']],
          limit,
          offset: (page - 1) * limit,
        });
        res.status(200).json({
          success: true,
          data: rows,
          meta: { page, limit, total: count, totalPages: Math.max(1, Math.ceil(count / limit)) },
        });
      } catch (err) {
        next(err);
      }
    },

    detail: async (req, res, next) => {
      try {
        res.status(200).json({ success: true, data: await cari(req.params.id) });
      } catch (err) {
        next(err);
      }
    },

    create: async (req, res, next) => {
      try {
        if (!req.body.password) throw httpError(400, 'Password wajib diisi');
        const data = pick(req.body, FIELDS[role]);
        if (role === 'penghuni') {
          data.kamar = normalKamar(data.kamar);
          if (!data.jenisKelamin || !data.asramaId || !data.kamar) {
            throw httpError(400, 'Jenis kelamin, gedung, dan kamar wajib diisi');
          }
          await cekPenempatan(data);
        }
        const user = await User.create({ ...data, password: req.body.password, role });
        res.status(201).json({
          success: true,
          data: await cari(user.id),
          message: `Data ${LABEL[role].toLowerCase()} berhasil ditambahkan`,
        });
      } catch (err) {
        next(err);
      }
    },

    // password hanya diganti kalau diisi
    update: async (req, res, next) => {
      try {
        const user = await cari(req.params.id);
        const data = pick(req.body, FIELDS[role]);
        if (req.body.password) data.password = req.body.password;
        // penghuni nonaktif tidak menempati kamar, jadi kapasitas tidak dicek
        if (role === 'penghuni' && user.status === 'aktif') {
          if (data.kamar !== undefined) data.kamar = normalKamar(data.kamar);
          const baru = { asramaId: user.asramaId, kamar: user.kamar, jenisKelamin: user.jenisKelamin, ...data };
          const pindah = ['asramaId', 'kamar', 'jenisKelamin'].some((k) => String(baru[k]) !== String(user[k]));
          if (pindah) await cekPenempatan({ ...baru, kecualiId: user.id });
        }
        await user.update(data);
        res.status(200).json({
          success: true,
          data: await cari(user.id),
          message: `Data ${LABEL[role].toLowerCase()} berhasil diperbarui`,
        });
      } catch (err) {
        next(err);
      }
    },

    // PATCH /:id/status — nonaktifkan / aktifkan, data tidak dihapus permanen
    setStatus: async (req, res, next) => {
      try {
        const { status } = req.body;
        if (!['aktif', 'nonaktif'].includes(status)) throw httpError(400, 'Status tidak valid');
        const user = await cari(req.params.id);
        // mengaktifkan kembali = menempati kamarnya lagi, jadi kamar tidak boleh penuh
        if (role === 'penghuni' && status === 'aktif' && user.status !== 'aktif') {
          await cekPenempatan({ asramaId: user.asramaId, kamar: user.kamar, jenisKelamin: user.jenisKelamin, kecualiId: user.id });
        }
        await user.update({ status });
        res.status(200).json({
          success: true,
          data: user,
          message: `${LABEL[role]} berhasil ${status === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'}`,
        });
      } catch (err) {
        next(err);
      }
    },
  };
};
