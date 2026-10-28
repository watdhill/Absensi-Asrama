import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, History } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../lib/hooks';
import { hariTanggal, jamMenit, sapaan, SESI_LABEL, tglPendek } from '../../lib/format';
import { Badge, EmptyState, ErrorBox, Loading } from '../../components/ui';
import { DetailPresensiModal, SesiCard, useSesiHariIni } from './sesi';

export default function DashboardPenghuni() {
  const { user } = useAuth();
  const hariIni = useSesiHariIni();
  const riwayat = useFetch(() => api.get('/presensi/saya'), []);
  const [detail, setDetail] = useState(null);

  const terbaru = riwayat.data?.data.slice(0, 5) || [];

  return (
    <div className="stack">
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>
            {sapaan(hariIni.jam)}, {user.name.split(' ')[0]} 👋
          </h1>
          <p>
            {user.Asrama?.nama || 'Asrama UNAND'} • Kamar {user.kamar || '-'}
          </p>
        </div>
        <div className="hero-clock">
          <strong>{hariIni.jam.slice(0, 5)} WIB</strong>
          <span style={{ opacity: 0.85 }}>{hariIni.tanggal && hariTanggal(hariIni.tanggal)}</span>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Presensi Hari Ini</h2>
            <div className="card-sub">Lakukan presensi sesuai jadwal sesi yang sedang dibuka</div>
          </div>
        </div>
        <div className="card-pad">
          {hariIni.error ? (
            <ErrorBox message={hariIni.error} onRetry={hariIni.reload} />
          ) : hariIni.loading ? (
            <Loading />
          ) : (
            <div className="grid grid-2">
              {hariIni.sesi.map((s) => (
                <SesiCard key={s.sesi} sesi={s} onDetail={(x) => setDetail({ ...x, tanggal: hariIni.tanggal })} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Riwayat Terbaru</h2>
          <Link to="/riwayat" className="btn btn-ghost btn-sm">
            Lihat Semua <ArrowRight size={16} />
          </Link>
        </div>
        {riwayat.loading && !riwayat.data ? (
          <Loading />
        ) : terbaru.length === 0 ? (
          <EmptyState icon={History} title="Belum ada riwayat presensi" />
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
                {terbaru.map((r) => (
                  <tr key={r.tanggal + r.sesi} className="clickable" onClick={() => setDetail(r)}>
                    <td className="cell-main">{tglPendek(r.tanggal)}</td>
                    <td>{SESI_LABEL[r.sesi]}</td>
                    <td className="num">{jamMenit(r.waktu)}</td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DetailPresensiModal item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
