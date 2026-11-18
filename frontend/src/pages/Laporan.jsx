import { useMemo, useState } from 'react';
import { CircleX, FileSpreadsheet, Percent, Printer, SearchX, TriangleAlert, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../lib/hooks';
import { hariIniWIB, namaBulan, tglPanjang } from '../lib/format';
import { Button, EmptyState, ErrorBox, Loading, PageHead, SearchInput, StatCard } from '../components/ui';

function Kehadiran({ persen, batas }) {
  if (persen === null) return <span className="muted">-</span>;
  const kurang = persen < batas;
  return (
    <div className="row" style={{ gap: 8, minWidth: 130 }}>
      <div className="progress" style={{ flex: 1, height: 8 }}>
        <span style={{ width: `${persen}%`, background: kurang ? 'var(--danger)' : 'var(--success)' }} />
      </div>
      <span className="strong num" style={{ color: kurang ? 'var(--danger-text)' : undefined, width: 40, textAlign: 'right' }}>
        {persen}%
      </span>
    </div>
  );
}

export default function Laporan() {
  const { user } = useAuth();
  const toast = useToast();
  const admin = user.role === 'admin';
  const [filter, setFilter] = useState({ bulan: hariIniWIB().slice(0, 7), asramaId: '' });
  const [cari, setCari] = useState('');
  const [urut, setUrut] = useState('kamar');
  const [hanyaKurang, setHanyaKurang] = useState(false);
  const [mengunduh, setMengunduh] = useState(false);

  const q = useFetch(() => api.get('/laporan/rekap', filter), [filter.bulan, filter.asramaId]);
  const asrama = useFetch(() => (admin ? api.get('/asrama') : Promise.resolve(null)), []);

  const info = q.data?.info;
  const r = q.data?.ringkasan;
  const batas = info?.batas ?? 75;

  const rows = useMemo(() => {
    let list = q.data?.data || [];
    const k = cari.trim().toLowerCase();
    if (k) list = list.filter((p) => p.name.toLowerCase().includes(k) || (p.nomorInduk || '').includes(k));
    if (hanyaKurang) list = list.filter((p) => p.persentase !== null && p.persentase < batas);
    if (urut === 'terendah') list = [...list].sort((a, b) => (a.persentase ?? 101) - (b.persentase ?? 101));
    return list;
  }, [q.data, cari, hanyaKurang, urut, batas]);

  const exportExcel = async () => {
    setMengunduh(true);
    try {
      const nama = `rekap-kehadiran-${filter.bulan}.xlsx`;
      await api.unduh('/laporan/rekap/excel', filter, nama);
      toast.success('File Excel berhasil diunduh');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMengunduh(false);
    }
  };

  const set = (k) => (e) => setFilter({ ...filter, [k]: e.target.value });

  return (
    <>
      <div className="print-only laporan-kop">
        <h1>Rekap Kehadiran Penghuni Asrama Universitas Andalas</h1>
        <p>
          Periode {info?.namaBulan} ({info && `${tglPanjang(info.awal)} – ${tglPanjang(info.akhir)}`}) • {info?.asrama}
        </p>
      </div>

      <PageHead
        title="Laporan Kehadiran"
        subtitle={info ? `${info.namaBulan} • ${info.asrama} • data sampai ${tglPanjang(info.akhir)}` : 'Rekap kehadiran bulanan penghuni'}
      >
        <Button variant="secondary" onClick={() => window.print()} disabled={!rows.length}>
          <Printer size={16} /> Cetak / PDF
        </Button>
        <Button onClick={exportExcel} loading={mengunduh} disabled={!q.data?.data.length}>
          <FileSpreadsheet size={16} /> Export Excel
        </Button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={Users} label="Total Penghuni" value={r ? r.totalPenghuni : '-'} hint={info?.asrama} />
        <StatCard
          icon={Percent}
          tone="success"
          label="Rata-rata Kehadiran"
          value={r?.rataRata != null ? `${r.rataRata}%` : '-'}
          hint={info?.namaBulan}
        />
        <StatCard
          icon={TriangleAlert}
          tone="danger"
          label={`Kehadiran < ${batas}%`}
          value={r ? r.dibawahBatas : '-'}
          hint="penghuni perlu perhatian"
        />
        <StatCard icon={CircleX} tone="warning" label="Total Tidak Hadir" value={r ? r.totalTidakHadir : '-'} hint="sesi" />
      </div>

      <section className="card">
        <div className="toolbar no-print">
          <SearchInput value={cari} onChange={setCari} placeholder="Cari nama / NIM..." />
          <input type="month" className="input" value={filter.bulan} max={hariIniWIB().slice(0, 7)} onChange={set('bulan')} aria-label="Bulan" />
          {admin && (
            <select className="select" value={filter.asramaId} onChange={set('asramaId')} aria-label="Gedung">
              <option value="">Semua Gedung</option>
              {asrama.data?.data.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
            </select>
          )}
          <select className="select" value={urut} onChange={(e) => setUrut(e.target.value)} aria-label="Urutkan">
            <option value="kamar">Urut: Gedung & kamar</option>
            <option value="terendah">Urut: Kehadiran terendah</option>
          </select>
          <label className="check">
            <input type="checkbox" checked={hanyaKurang} onChange={(e) => setHanyaKurang(e.target.checked)} />
            Hanya &lt; {batas}%
          </label>
        </div>

        {q.error ? (
          <div className="card-pad">
            <ErrorBox message={q.error} onRetry={q.reload} />
          </div>
        ) : q.loading && !q.data ? (
          <Loading text="Menghitung rekap..." />
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="Tidak ada data">
            {filter.bulan > hariIniWIB().slice(0, 7) ? 'Periode ini belum berjalan.' : 'Coba ubah bulan, gedung, atau filter.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Gedung / Kamar</th>
                  <th>Hadir</th>
                  <th>Izin</th>
                  <th>Tidak Hadir</th>
                  <th>Total Sesi</th>
                  <th>Kehadiran</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className={p.persentase !== null && p.persentase < batas ? 'baris-kurang' : ''}>
                    <td className="num muted">{i + 1}</td>
                    <td>
                      <div className="cell-main">{p.name}</div>
                      <div className="cell-sub">
                        {p.nomorInduk}
                        {p.status !== 'aktif' && ' • tidak aktif'}
                      </div>
                    </td>
                    <td>
                      {p.kamar}
                      <div className="cell-sub">{p.gedung}</div>
                    </td>
                    <td className="num">{p.hadir}</td>
                    <td className="num">{p.izin}</td>
                    <td className="num" style={{ color: p.tidakHadir ? 'var(--danger-text)' : undefined }}>
                      {p.tidakHadir}
                    </td>
                    <td className="num">{p.totalSesi}</td>
                    <td>
                      <Kehadiran persen={p.persentase} batas={batas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <div className="pagination">
            <span>
              {rows.length} penghuni • Kehadiran = hadir ÷ total sesi tercatat (hadir + izin + tidak hadir)
            </span>
            <span className="no-print">{info && namaBulan(info.bulan)}</span>
          </div>
        )}
      </section>
    </>
  );
}
