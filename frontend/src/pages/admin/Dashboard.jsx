import { Link } from 'react-router-dom';
import { ArrowRight, Building2, ClipboardCheck, UserCheck, UserCog, Users } from 'lucide-react';
import { api } from '../../api';
import { useFetch } from '../../lib/hooks';
import { hariTanggal } from '../../lib/format';
import { ErrorBox, Loading, PageHead, StatCard } from '../../components/ui';
import { RekapSesi } from '../fasil/Dashboard';

const AKSES = [
  { to: '/penghuni', icon: Users, title: 'Kelola Penghuni', desc: 'Tambah, ubah, dan nonaktifkan data penghuni asrama' },
  { to: '/fasil', icon: UserCog, title: 'Kelola Fasil', desc: 'Atur akun fasil dan penugasan asramanya' },
  { to: '/data-presensi', icon: ClipboardCheck, title: 'Data Presensi', desc: 'Pantau dan koreksi presensi seluruh asrama' },
];

export default function DashboardAdmin() {
  const q = useFetch(() => api.get('/dashboard'), []);

  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading />;
  const d = q.data.data;

  return (
    <div className="stack">
      <PageHead title="Dashboard Admin" subtitle={`Ringkasan data asrama • ${hariTanggal(d.tanggal)}`} />

      <div className="grid grid-4">
        <StatCard icon={Users} label="Total Penghuni" value={d.totalPenghuni} hint="penghuni aktif" />
        <StatCard icon={UserCog} tone="info" label="Total Fasil" value={d.totalFasil} hint="fasil aktif" />
        <StatCard icon={Building2} tone="warning" label="Total Asrama" value={d.totalAsrama} hint="gedung" />
        <StatCard
          icon={UserCheck}
          tone="success"
          label="Presensi Hari Ini"
          value={`${d.hadirHariIni}/${d.totalPenghuni}`}
          hint={d.sesiAcuan ? `hadir sesi ${d.sesiAcuan}` : 'belum ada sesi dimulai'}
        />
      </div>

      <div className="grid grid-3">
        {AKSES.map((a) => (
          <Link key={a.to} to={a.to} className="card quick-card">
            <div className="stat-icon tone-primary" style={{ width: 52, height: 52 }}>
              <a.icon size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="strong" style={{ fontSize: 16 }}>
                {a.title}
              </div>
              <div className="muted small">{a.desc}</div>
            </div>
            <ArrowRight size={18} color="var(--text-3)" />
          </Link>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Presensi Hari Ini — Semua Asrama</h2>
          <span className="card-sub">{d.izinMenunggu} izin menunggu persetujuan</span>
        </div>
        <div className="card-pad">
          <RekapSesi sesi={d.sesi} />
        </div>
      </section>
    </div>
  );
}
