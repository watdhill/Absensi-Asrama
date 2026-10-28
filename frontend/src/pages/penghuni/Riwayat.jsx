import { useState } from 'react';
import { CircleCheck, CircleX, FileText, History, Percent } from 'lucide-react';
import { api } from '../../api';
import { useFetch } from '../../lib/hooks';
import { hariIniWIB, jamMenit, namaBulan, SESI_LABEL, tglPendek } from '../../lib/format';
import { Badge, EmptyState, ErrorBox, Loading, PageHead, StatCard } from '../../components/ui';
import { DetailPresensiModal } from './sesi';

const bulanIni = () => hariIniWIB().slice(0, 7);

export default function Riwayat() {
  const [filter, setFilter] = useState({ bulan: bulanIni(), sesi: '', status: '' });
  const [detail, setDetail] = useState(null);
  const q = useFetch(() => api.get('/presensi/saya', filter), [filter.bulan, filter.sesi, filter.status]);

  const rows = q.data?.data || [];
  const r = q.data?.ringkasan;
  const set = (k) => (e) => setFilter({ ...filter, [k]: e.target.value });

  return (
    <>
      <PageHead title="Riwayat Presensi" subtitle={`Rekap kehadiran ${namaBulan(filter.bulan)}`} />

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard icon={CircleCheck} tone="success" label="Total Hadir" value={r ? r.hadir : '-'} hint="sesi" />
        <StatCard icon={CircleX} tone="danger" label="Tidak Hadir" value={r ? r.tidakHadir : '-'} hint="sesi" />
        <StatCard icon={FileText} tone="info" label="Izin" value={r ? r.izin : '-'} hint="sesi" />
        <StatCard icon={Percent} tone="primary" label="Persentase Kehadiran" value={r ? `${r.persentase}%` : '-'} />
      </div>

      <section className="card">
        <div className="toolbar">
          <input type="month" className="input" value={filter.bulan} max={bulanIni()} onChange={set('bulan')} aria-label="Bulan" />
          <select className="select" value={filter.sesi} onChange={set('sesi')} aria-label="Sesi">
            <option value="">Semua Sesi</option>
            <option value="pagi">Pagi</option>
            <option value="malam">Malam</option>
          </select>
          <select className="select" value={filter.status} onChange={set('status')} aria-label="Status">
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="tidak_hadir">Tidak Hadir</option>
            <option value="belum">Belum Presensi</option>
          </select>
        </div>

        {q.error ? (
          <div className="card-pad">
            <ErrorBox message={q.error} onRetry={q.reload} />
          </div>
        ) : q.loading && !q.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title="Tidak ada data presensi">
            Coba ubah filter bulan, sesi, atau status.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Sesi</th>
                  <th>Waktu</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.tanggal + row.sesi} className="clickable" onClick={() => setDetail(row)}>
                    <td className="cell-main">{tglPendek(row.tanggal)}</td>
                    <td>{SESI_LABEL[row.sesi]}</td>
                    <td className="num">{jamMenit(row.waktu)}</td>
                    <td>
                      <Badge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DetailPresensiModal item={detail} onClose={() => setDetail(null)} />
    </>
  );
}
