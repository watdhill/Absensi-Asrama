const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { User, Asrama } = require('../models');
const { SESI_KEYS, sekarang, statusSesi, rentangTanggal } = require('../utils/waktu');
const { muatStatus } = require('../utils/statusPresensi');
const httpError = require('../utils/httpError');

// penghuni dengan persentase kehadiran di bawah angka ini ditandai
const BATAS_KEHADIRAN = 75;
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Rekap kehadiran satu bulan untuk semua penghuni dalam cakupan user (fasil:
// asramanya sendiri, admin: semua atau gedung yang dipilih).
async function hitungRekap(req) {
  const now = sekarang();
  const bulan = /^\d{4}-\d{2}$/.test(req.query.bulan || '') ? req.query.bulan : now.tanggal.slice(0, 7);
  const [y, m] = bulan.split('-').map(Number);
  const awal = `${bulan}-01`;
  const akhirBulan = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const akhir = akhirBulan > now.tanggal ? now.tanggal : akhirBulan;

  const where = { role: 'penghuni' };
  if (req.user.role === 'fasil') where.asramaId = req.user.asramaId;
  else if (req.query.asramaId) where.asramaId = req.query.asramaId;
  const asrama = where.asramaId ? await Asrama.findByPk(where.asramaId) : null;

  const info = { bulan, namaBulan: `${BULAN[m - 1]} ${y}`, awal, akhir, asrama: asrama?.nama || 'Semua gedung', batas: BATAS_KEHADIRAN };
  if (awal > now.tanggal) return { ...info, tanggal: [], data: [] };

  const penghuni = await User.findAll({
    where: { ...where, tanggalMasuk: { [Op.lte]: akhir } },
    include: { model: Asrama, attributes: ['id', 'nama', 'kode'] },
    order: [[Asrama, 'kode', 'ASC'], ['kamar', 'ASC'], ['name', 'ASC']],
  });
  const lookup = await muatStatus(penghuni.map((p) => p.id), awal, akhir, now);
  const tanggal = rentangTanggal(awal, akhir);

  const data = penghuni.map((p) => {
    const hitung = { hadir: 0, izin: 0, tidak_hadir: 0 };
    const harian = {};
    for (const t of tanggal) {
      for (const sesi of SESI_KEYS) {
        // sebelum terdaftar, atau sesi hari ini yang belum dimulai -> tidak dihitung
        if (t < p.tanggalMasuk || (t === now.tanggal && statusSesi(sesi, now) === 'belum_dibuka')) continue;
        const { status } = lookup(p.id, t, sesi);
        harian[`${t}|${sesi}`] = status;
        if (hitung[status] !== undefined) hitung[status] += 1;
      }
    }
    const total = hitung.hadir + hitung.izin + hitung.tidak_hadir;
    return {
      id: p.id,
      nomorInduk: p.nomorInduk,
      name: p.name,
      gedung: p.Asrama?.nama || '-',
      kamar: p.kamar,
      status: p.status,
      hadir: hitung.hadir,
      izin: hitung.izin,
      tidakHadir: hitung.tidak_hadir,
      totalSesi: total,
      persentase: total ? Math.round((hitung.hadir / total) * 100) : null,
      harian,
    };
  });
  return { ...info, tanggal, data };
}

function ringkas(data) {
  const ada = data.filter((r) => r.persentase !== null);
  return {
    totalPenghuni: data.length,
    rataRata: ada.length ? Math.round(ada.reduce((s, r) => s + r.persentase, 0) / ada.length) : null,
    dibawahBatas: ada.filter((r) => r.persentase < BATAS_KEHADIRAN).length,
    totalTidakHadir: data.reduce((s, r) => s + r.tidakHadir, 0),
  };
}

// GET /api/laporan/rekap?bulan=2026-11&asramaId= (fasil, admin)
exports.rekap = async (req, res, next) => {
  try {
    const hasil = await hitungRekap(req);
    const data = hasil.data.map(({ harian, ...r }) => r); // detail harian hanya untuk Excel
    res.status(200).json({ success: true, data, info: { ...hasil, data: undefined, tanggal: undefined }, ringkasan: ringkas(hasil.data) });
  } catch (err) {
    next(err);
  }
};

const WARNA = { hadir: 'FFDCFCE7', izin: 'FFDBEAFE', tidak_hadir: 'FFFEE2E2', belum: 'FFF2F4F7' };
const KODE = { hadir: 'H', izin: 'I', tidak_hadir: 'T', belum: '-' };
const HIJAU = 'FF0B6B3A';

function gayaHeader(row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HIJAU } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { bottom: { style: 'thin' } };
  });
  row.height = 22;
}

// GET /api/laporan/rekap/excel?bulan=&asramaId= (fasil, admin)
exports.excel = async (req, res, next) => {
  try {
    const r = await hitungRekap(req);
    if (!r.data.length) throw httpError(404, 'Tidak ada data penghuni untuk periode ini');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistem Absensi Penghuni Asrama UNAND';
    wb.created = new Date();

    // ---- sheet 1: rekap per penghuni
    const ws = wb.addWorksheet('Rekap', { views: [{ state: 'frozen', ySplit: 6 }] });
    ws.columns = [
      { key: 'no', width: 5 },
      { key: 'nomorInduk', width: 14 },
      { key: 'name', width: 28 },
      { key: 'gedung', width: 22 },
      { key: 'kamar', width: 9 },
      { key: 'status', width: 12 },
      { key: 'hadir', width: 8 },
      { key: 'izin', width: 8 },
      { key: 'tidakHadir', width: 12 },
      { key: 'totalSesi', width: 11 },
      { key: 'persentase', width: 12 },
    ];
    ws.mergeCells('A1:K1');
    ws.getCell('A1').value = 'Rekap Kehadiran Penghuni Asrama Universitas Andalas';
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: HIJAU } };
    ws.getCell('A2').value = `Periode: ${r.namaBulan} (data ${r.awal} s.d. ${r.akhir})`;
    ws.getCell('A3').value = `Gedung: ${r.asrama}`;
    ws.getCell('A4').value = `Baris merah: kehadiran di bawah ${BATAS_KEHADIRAN}%. Persentase = hadir ÷ total sesi tercatat.`;
    ws.getCell('A4').font = { italic: true, size: 9, color: { argb: 'FF667085' } };

    ws.getRow(6).values =['No', 'NIM', 'Nama', 'Gedung', 'Kamar', 'Status Akun', 'Hadir', 'Izin', 'Tidak Hadir', 'Total Sesi', 'Kehadiran'];
    gayaHeader(ws.getRow(6));

    r.data.forEach((p, i) => {
      const row = ws.addRow({
        no: i + 1,
        nomorInduk: p.nomorInduk,
        name: p.name,
        gedung: p.gedung,
        kamar: p.kamar,
        status: p.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
        hadir: p.hadir,
        izin: p.izin,
        tidakHadir: p.tidakHadir,
        totalSesi: p.totalSesi,
        persentase: p.persentase === null ? '-' : p.persentase / 100,
      });
      row.getCell('persentase').numFmt = '0%';
      ['no', 'kamar', 'hadir', 'izin', 'tidakHadir', 'totalSesi', 'persentase'].forEach((k) => (row.getCell(k).alignment = { horizontal: 'center' }));
      if (p.persentase !== null && p.persentase < BATAS_KEHADIRAN) {
        row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA.tidak_hadir } }));
      }
    });
    ws.autoFilter = { from: 'A6', to: `K${r.data.length + 6}` };

    // ---- sheet 2: status per tanggal & sesi
    const wd = wb.addWorksheet('Detail Harian', { views: [{ state: 'frozen', xSplit: 4, ySplit: 3 }] });
    wd.getCell('A1').value = `Detail presensi harian — ${r.namaBulan} — ${r.asrama}. H = Hadir, I = Izin, T = Tidak Hadir, - = belum/tidak dihitung. P = pagi, M = malam.`;
    wd.getCell('A1').font = { bold: true };
    const kepala = ['No', 'NIM', 'Nama', 'Kamar'];
    for (const t of r.tanggal) for (const s of SESI_KEYS) kepala.push(`${Number(t.slice(8))} ${s === 'pagi' ? 'P' : 'M'}`);
    wd.getRow(3).values = kepala;
    gayaHeader(wd.getRow(3));
    wd.getColumn(1).width = 5;
    wd.getColumn(2).width = 14;
    wd.getColumn(3).width = 26;
    wd.getColumn(4).width = 9;
    for (let c = 5; c <= kepala.length; c++) wd.getColumn(c).width = 5.5;

    r.data.forEach((p, i) => {
      const nilai = [i + 1, p.nomorInduk, p.name, p.kamar];
      const status = [];
      for (const t of r.tanggal) for (const s of SESI_KEYS) status.push(p.harian[`${t}|${s}`] || null);
      const row = wd.addRow([...nilai, ...status.map((s) => (s ? KODE[s] : '-'))]);
      status.forEach((s, j) => {
        const c = row.getCell(5 + j);
        c.alignment = { horizontal: 'center' };
        if (s) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNA[s] } };
      });
    });

    const namaFile = `rekap-kehadiran-${r.bulan}${req.user.role === 'fasil' || req.query.asramaId ? `-${r.asrama.toLowerCase().replace(/\s+/g, '-')}` : ''}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
