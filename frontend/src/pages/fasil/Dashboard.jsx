import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CircleCheck, Clock, FileText, UserCheck, Users } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../lib/hooks';
import { hariTanggal, inisial, SESI_LABEL } from '../../lib/format';
import { Badge, EmptyState, ErrorBox, Loading, StatCard } from '../../components/ui';

// Ringkasan presensi per sesi dengan progress bar
export function RekapSesi({ sesi }) {
  return (
    <div className="stack" style={{ gap: 18 }}>
      {sesi.map((s) => {
        const persen = s.total ? Math.round((s.hadir / s.total) * 100) : 0;
        return (
          <div key={s.sesi}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="row">
                <div className={`stat-icon ${s.sesi === 'pagi' ? 'tone-warning' : 'tone-primary'}`} style={{ width: 36, height: 36 }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div className="strong">{s.label}</div>
                  <div className="cell-sub">
                    {s.mulai} – {s.selesai} WIB
                  </div>
                </div>
              </div>
              {s.state === 'belum_dibuka' ? (
                <span className="indicator off">
                  <i /> Belum dimulai
                </span>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <div className="strong" style={{ fontSize: 16 }}>
                    {s.hadir} / {s.total} Hadir
                  </div>
                  <div className={`indicator ${s.state === 'dibuka' ? 'on' : 'off'}`} style={{ fontSize: 12 }}>
                    <i /> {s.state === 'dibuka' ? 'Sedang berlangsung' : 'Selesai'} • {persen}%
                  </div>
                </div>
              )}
            </div>
            <div className="progress">
              <span style={{ width: `${s.state === 'belum_dibuka' ? 0 : persen}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardFasil() {
  const { user } = useAuth();
  const q = useFetch(() => api.get('/dashboard'), []);

  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading />;
  const d = q.data.data;
  const acuan = d.sesi.find((s) => s.sesi === d.sesiAcuan);

  return (
    <div className="stack">
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>Selamat datang, {user.name.split(' ')[0]} 👋</h1>
          <p>Fasil {user.Asrama?.nama || 'Asrama UNAND'} • {hariTanggal(d.tanggal)}</p>
        </div>
      </div>

      <div className="grid grid-4">
        <StatCard icon={Users} label="Total Penghuni" value={d.totalPenghuni} hint="penghuni aktif" />
        <StatCard
          icon={UserCheck}
          tone="success"
          label="Hadir Hari Ini"
          value={d.hadirHariIni}
          hint={acuan ? `sesi ${SESI_LABEL[acuan.sesi].toLowerCase()}` : 'belum ada sesi dimulai'}
        />
        <StatCard
          icon={Clock}
          tone="muted"
          label="Belum Presensi"
          value={d.jumlahBelumPresensi}
          hint={acuan ? `sesi ${SESI_LABEL[acuan.sesi].toLowerCase()}` : '-'}
        />
        <StatCard icon={FileText} tone="warning" label="Izin Menunggu" value={d.izinMenunggu} hint="perlu ditinjau" />
      </div>

      <div className="grid grid-main" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-head">
            <h2>Presensi Hari Ini</h2>
            <Link to="/data-presensi" className="btn btn-ghost btn-sm">
              Data Presensi <ArrowRight size={16} />
            </Link>
          </div>
          <div className="card-pad">
            <RekapSesi sesi={d.sesi} />
          </div>
        </section>

        <section className="card card-pad stack" style={{ gap: 14, borderLeft: d.izinMenunggu ? '4px solid var(--accent)' : undefined }}>
          <div className="row">
            <div className="stat-icon tone-warning">
              <Bell size={22} />
            </div>
            <div className="strong" style={{ fontSize: 16 }}>
              {d.izinMenunggu ? `${d.izinMenunggu} pengajuan izin menunggu persetujuan` : 'Tidak ada izin yang menunggu'}
            </div>
          </div>
          <p className="muted">Tinjau bukti izin dan putuskan pengajuan penghuni agar presensinya tercatat dengan benar.</p>
          <Link to="/perizinan" className="btn btn-primary">
            Lihat Perizinan
          </Link>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Penghuni Belum Presensi</h2>
            <div className="card-sub">
              {acuan ? `${acuan.label} • ${d.jumlahBelumPresensi} penghuni` : 'Belum ada sesi yang dimulai hari ini'}
            </div>
          </div>
          {d.jumlahBelumPresensi > d.belumPresensi.length && (
            <Link to="/data-presensi" className="btn btn-ghost btn-sm">
              Lihat Semua <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {d.belumPresensi.length === 0 ? (
          <EmptyState icon={CircleCheck} title={acuan ? 'Semua penghuni sudah presensi' : 'Belum ada sesi'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kamar</th>
                  <th>Sesi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.belumPresensi.map((r) => (
                  <tr key={r.penghuni.id}>
                    <td>
                      <div className="row">
                        <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {inisial(r.penghuni.name)}
                        </span>
                        <div>
                          <div className="cell-main">{r.penghuni.name}</div>
                          <div className="cell-sub">{r.penghuni.nomorInduk}</div>
                        </div>
                      </div>
                    </td>
                    <td>{r.penghuni.kamar}</td>
                    <td>{SESI_LABEL[r.sesi]}</td>
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
    </div>
  );
}
