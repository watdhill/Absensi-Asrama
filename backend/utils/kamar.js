const { Op } = require('sequelize');
const { User, Asrama, Kamar } = require('../models');
const httpError = require('./httpError');

const KAPASITAS_DEFAULT = 4;

// gedung putra hanya untuk laki-laki, putri untuk perempuan, internasional keduanya
const JK_GEDUNG = { putra: ['L'], putri: ['P'], internasional: ['L', 'P'] };

// "a-203 " -> "A-203"
const normalKamar = (kamar) => (kamar ? String(kamar).trim().toUpperCase().replace(/\s+/g, '') : kamar);

// Penghuni aktif di satu kamar, selain `kecualiId` (penghuni yang sedang diedit)
function penghuniKamar(asramaId, kamar, kecualiId) {
  return User.findAll({
    where: {
      role: 'penghuni',
      status: 'aktif',
      asramaId,
      kamar,
      ...(kecualiId ? { id: { [Op.ne]: kecualiId } } : {}),
    },
    attributes: ['id', 'name', 'jenisKelamin'],
  });
}

// Validasi penempatan penghuni aktif: gedung sesuai jenis kelamin, kamar terdaftar
// di gedung itu, kamar belum penuh, dan satu kamar satu jenis kelamin.
async function cekPenempatan({ asramaId, kamar, jenisKelamin, kecualiId }) {
  const asrama = await Asrama.findByPk(asramaId);
  if (!asrama) throw httpError(400, 'Gedung asrama tidak ditemukan');

  if (jenisKelamin && !JK_GEDUNG[asrama.jenis].includes(jenisKelamin)) {
    throw httpError(400, `${asrama.nama} hanya untuk penghuni ${asrama.jenis === 'putra' ? 'laki-laki' : 'perempuan'}`);
  }

  const dataKamar = await Kamar.findOne({ where: { asramaId, nomor: kamar || '' } });
  if (!dataKamar) throw httpError(400, `Kamar ${kamar || '-'} tidak terdaftar di ${asrama.nama}`);

  const isi = await penghuniKamar(asramaId, kamar, kecualiId);
  if (isi.length >= dataKamar.kapasitas) {
    throw httpError(409, `Kamar ${kamar} sudah penuh (${dataKamar.kapasitas}/${dataKamar.kapasitas} penghuni)`);
  }
  const beda = isi.find((p) => p.jenisKelamin && jenisKelamin && p.jenisKelamin !== jenisKelamin);
  if (beda) throw httpError(400, `Kamar ${kamar} sudah ditempati penghuni ${beda.jenisKelamin === 'L' ? 'laki-laki' : 'perempuan'}`);
}

// Semua kamar satu gedung beserta penghuni aktifnya. Kamar yang ditempati tapi
// belum terdaftar (data lama) tetap ditampilkan dengan terdaftar: false.
async function rekapKamar(asramaId) {
  const [daftar, penghuni] = await Promise.all([
    Kamar.findAll({ where: { asramaId }, order: [['lantai', 'ASC'], ['nomor', 'ASC']] }),
    User.findAll({
      where: { role: 'penghuni', status: 'aktif', asramaId },
      attributes: ['id', 'name', 'nomorInduk', 'kamar', 'jenisKelamin'],
      order: [['name', 'ASC']],
    }),
  ]);

  const isi = new Map();
  for (const p of penghuni) {
    if (!isi.has(p.kamar)) isi.set(p.kamar, []);
    isi.get(p.kamar).push({ id: p.id, name: p.name, nomorInduk: p.nomorInduk, jenisKelamin: p.jenisKelamin });
  }

  const hasil = daftar.map((k) => {
    const orang = isi.get(k.nomor) || [];
    isi.delete(k.nomor);
    return {
      id: k.id,
      kamar: k.nomor,
      lantai: k.lantai,
      kapasitas: k.kapasitas,
      terisi: orang.length,
      penuh: orang.length >= k.kapasitas,
      jenisKelamin: orang[0]?.jenisKelamin || null,
      penghuni: orang,
      terdaftar: true,
    };
  });
  for (const [nomor, orang] of isi) {
    hasil.push({ id: null, kamar: nomor, lantai: null, kapasitas: null, terisi: orang.length, penuh: false, jenisKelamin: orang[0]?.jenisKelamin || null, penghuni: orang, terdaftar: false });
  }
  return hasil;
}

module.exports = { KAPASITAS_DEFAULT, JK_GEDUNG, normalKamar, cekPenempatan, rekapKamar };
