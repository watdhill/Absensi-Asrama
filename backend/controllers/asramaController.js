const { Op } = require('sequelize');
const { Asrama, Kamar, User, sequelize } = require('../models');
const { KAPASITAS_DEFAULT, JK_GEDUNG, normalKamar, rekapKamar } = require('../utils/kamar');
const httpError = require('../utils/httpError');

const FIELDS = ['nama', 'kode', 'jenis', 'latitude', 'longitude', 'radius'];
const pick = (obj) =>
  Object.fromEntries(FIELDS.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k] === '' ? null : obj[k]]));

// kolom hitungan tambahan untuk setiap gedung
const STATISTIK = [
  [`(SELECT COUNT(*) FROM "Users" u WHERE u."asramaId" = "Asrama"."id" AND u.role = 'penghuni' AND u.status = 'aktif')`, 'jumlahPenghuni'],
  [`(SELECT COUNT(DISTINCT u.kamar) FROM "Users" u WHERE u."asramaId" = "Asrama"."id" AND u.role = 'penghuni' AND u.status = 'aktif')`, 'kamarTerisi'],
  [`(SELECT COUNT(*) FROM "Kamar" k WHERE k."asramaId" = "Asrama"."id")`, 'jumlahKamar'],
  [`(SELECT COALESCE(SUM(k.kapasitas), 0) FROM "Kamar" k WHERE k."asramaId" = "Asrama"."id")`, 'kapasitasTotal'],
].map(([sql, nama]) => [sequelize.literal(sql), nama]);

async function cari(id) {
  const asrama = await Asrama.findByPk(id, { attributes: { include: STATISTIK } });
  if (!asrama) throw httpError(404, 'Gedung asrama tidak ditemukan');
  return asrama;
}

const jumlahUser = (asramaId) => User.count({ where: { asramaId } });

// GET /api/asrama — daftar gedung beserta statistik penghuni & kamar
exports.list = async (req, res, next) => {
  try {
    const data = await Asrama.findAll({ attributes: { include: STATISTIK }, order: [['kode', 'ASC']] });
    res.status(200).json({ success: true, data, kapasitasKamar: KAPASITAS_DEFAULT });
  } catch (err) {
    next(err);
  }
};

// GET /api/asrama/:id
exports.detail = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await cari(req.params.id) });
  } catch (err) {
    next(err);
  }
};

// POST /api/asrama (admin)
exports.create = async (req, res, next) => {
  try {
    const data = pick(req.body);
    data.kode = String(data.kode || '').trim().toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(data.kode)) throw httpError(400, 'Kode gedung berupa 1–3 huruf, misal A');
    const asrama = await Asrama.create(data);
    res.status(201).json({ success: true, data: await cari(asrama.id), message: 'Gedung asrama berhasil ditambahkan' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/asrama/:id (admin)
exports.update = async (req, res, next) => {
  try {
    const asrama = await cari(req.params.id);
    const data = pick(req.body);

    // kode menjadi awalan nomor kamar, jadi tidak boleh diganti kalau sudah dipakai
    if (data.kode !== undefined) {
      data.kode = String(data.kode).trim().toUpperCase();
      if (data.kode !== asrama.kode) {
        const dipakai = (await Kamar.count({ where: { asramaId: asrama.id } })) + (await jumlahUser(asrama.id));
        if (dipakai) throw httpError(400, 'Kode gedung tidak bisa diubah karena sudah punya kamar atau penghuni');
        if (!/^[A-Z]{1,3}$/.test(data.kode)) throw httpError(400, 'Kode gedung berupa 1–3 huruf, misal A');
      }
    }
    // jenis gedung tidak boleh bertentangan dengan jenis kelamin penghuni yang ada
    if (data.jenis && data.jenis !== asrama.jenis) {
      const bentrok = await User.count({
        where: { asramaId: asrama.id, role: 'penghuni', jenisKelamin: { [Op.notIn]: JK_GEDUNG[data.jenis] || [] } },
      });
      if (bentrok) throw httpError(400, `Ada ${bentrok} penghuni yang tidak sesuai dengan jenis gedung ${data.jenis}`);
    }

    await asrama.update(data);
    res.status(200).json({ success: true, data: await cari(asrama.id), message: 'Gedung asrama berhasil diperbarui' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/asrama/:id (admin) — hanya gedung tanpa penghuni/fasil
exports.remove = async (req, res, next) => {
  try {
    const asrama = await cari(req.params.id);
    const n = await jumlahUser(asrama.id);
    if (n) throw httpError(400, `Gedung masih dipakai oleh ${n} penghuni/fasil. Pindahkan mereka terlebih dahulu.`);
    await asrama.destroy(); // kamar ikut terhapus (CASCADE)
    res.status(200).json({ success: true, message: 'Gedung asrama berhasil dihapus' });
  } catch (err) {
    next(err);
  }
};

// GET /api/asrama/:id/kamar (admin) — semua kamar & penghuninya
exports.kamar = async (req, res, next) => {
  try {
    const asrama = await cari(req.params.id);
    res.status(200).json({ success: true, data: await rekapKamar(asrama.id), asrama });
  } catch (err) {
    next(err);
  }
};

// POST /api/asrama/:id/kamar (admin)
// - satu kamar:  { nomor: "A-215", lantai: 2, kapasitas: 4 }
// - sekaligus:   { lantaiDari: 1, lantaiSampai: 3, nomorDari: 1, nomorSampai: 10, kapasitas: 4 }
//   menghasilkan A-101 ... A-310; nomor yang sudah ada dilewati.
exports.tambahKamar = async (req, res, next) => {
  try {
    const asrama = await cari(req.params.id);
    const kapasitas = Number(req.body.kapasitas) || KAPASITAS_DEFAULT;
    let baru = [];

    if (req.body.nomor) {
      const nomor = normalKamar(req.body.nomor);
      if (!nomor.startsWith(`${asrama.kode}-`) || nomor.length <= asrama.kode.length + 1) {
        throw httpError(400, `Nomor kamar harus diawali "${asrama.kode}-", contoh ${asrama.kode}-101`);
      }
      baru = [{ nomor, lantai: Number(req.body.lantai) || 1, kapasitas }];
    } else {
      const [ld, ls, nd, ns] = ['lantaiDari', 'lantaiSampai', 'nomorDari', 'nomorSampai'].map((k) => Number(req.body[k]));
      if (![ld, ls, nd, ns].every(Number.isInteger) || ld < 1 || nd < 1 || ls < ld || ns < nd || ls > 20 || ns > 99) {
        throw httpError(400, 'Rentang lantai (1–20) atau nomor kamar (1–99) tidak valid');
      }
      for (let l = ld; l <= ls; l++) {
        for (let n = nd; n <= ns; n++) baru.push({ nomor: `${asrama.kode}-${l}${String(n).padStart(2, '0')}`, lantai: l, kapasitas });
      }
    }

    const ada = new Set((await Kamar.findAll({ where: { asramaId: asrama.id }, attributes: ['nomor'] })).map((k) => k.nomor));
    const dibuat = baru.filter((k) => !ada.has(k.nomor));
    if (!dibuat.length) throw httpError(409, 'Semua nomor kamar tersebut sudah terdaftar');
    await Kamar.bulkCreate(dibuat.map((k) => ({ ...k, asramaId: asrama.id })), { validate: true });

    const lewat = baru.length - dibuat.length;
    res.status(201).json({
      success: true,
      data: dibuat.map((k) => k.nomor),
      message: `${dibuat.length} kamar berhasil ditambahkan${lewat ? ` (${lewat} sudah ada, dilewati)` : ''}`,
    });
  } catch (err) {
    next(err);
  }
};

async function cariKamar(id) {
  const kamar = await Kamar.findByPk(id);
  if (!kamar) throw httpError(404, 'Kamar tidak ditemukan');
  const terisi = await User.count({ where: { role: 'penghuni', status: 'aktif', asramaId: kamar.asramaId, kamar: kamar.nomor } });
  return { kamar, terisi };
}

// PUT /api/kamar/:id (admin) — ubah lantai/kapasitas; nomor tidak bisa diubah
exports.ubahKamar = async (req, res, next) => {
  try {
    const { kamar, terisi } = await cariKamar(req.params.id);
    const kapasitas = req.body.kapasitas !== undefined ? Number(req.body.kapasitas) : kamar.kapasitas;
    if (kapasitas < terisi) throw httpError(400, `Kapasitas tidak boleh kurang dari jumlah penghuni sekarang (${terisi})`);
    await kamar.update({ kapasitas, lantai: req.body.lantai !== undefined ? Number(req.body.lantai) : kamar.lantai });
    res.status(200).json({ success: true, data: kamar, message: `Kamar ${kamar.nomor} berhasil diperbarui` });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/kamar/:id (admin) — hanya kamar kosong
exports.hapusKamar = async (req, res, next) => {
  try {
    const { kamar, terisi } = await cariKamar(req.params.id);
    if (terisi) throw httpError(400, `Kamar ${kamar.nomor} masih ditempati ${terisi} penghuni`);
    await kamar.destroy();
    res.status(200).json({ success: true, message: `Kamar ${kamar.nomor} berhasil dihapus` });
  } catch (err) {
    next(err);
  }
};
