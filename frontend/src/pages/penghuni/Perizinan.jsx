import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { api } from '../../api';
import { useFetch } from '../../lib/hooks';
import { rentangTgl, tglJam } from '../../lib/format';
import { Badge, EmptyState, ErrorBox, Loading, PageHead, Tabs } from '../../components/ui';

const TABS = [
  ['', 'Semua'],
  ['menunggu', 'Menunggu'],
  ['disetujui', 'Disetujui'],
  ['ditolak', 'Ditolak'],
];

export default function PerizinanPenghuni() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('');
  const q = useFetch(() => api.get('/izin'), []);
  const semua = q.data?.data || [];
  const rows = tab ? semua.filter((i) => i.status === tab) : semua;

  return (
    <>
      <PageHead title="Perizinan" subtitle="Ajukan izin tidak mengikuti presensi dan pantau status persetujuannya">
        <Link to="/perizinan/ajukan" className="btn btn-primary">
          <Plus size={18} /> Ajukan Izin
        </Link>
      </PageHead>

      <section className="card">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={TABS.map(([value, label]) => ({
            value,
            label,
            count: value ? semua.filter((i) => i.status === value).length : semua.length,
          }))}
        />

        {q.error ? (
          <div className="card-pad">
            <ErrorBox message={q.error} onRetry={q.reload} />
          </div>
        ) : q.loading && !q.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title="Belum ada pengajuan izin">
            Klik “Ajukan Izin” untuk membuat pengajuan baru.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Jenis Izin</th>
                  <th>Tanggal</th>
                  <th>Alasan</th>
                  <th>Status</th>
                  <th>Diajukan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((izin) => (
                  <tr key={izin.id} className="clickable" onClick={() => navigate(`/perizinan/${izin.id}`)}>
                    <td className="cell-main">{izin.jenis}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{rentangTgl(izin.tanggalMulai, izin.tanggalSelesai)}</td>
                    <td>
                      <div className="text-ellipsis">{izin.alasan}</div>
                    </td>
                    <td>
                      <Badge status={izin.status} />
                    </td>
                    <td className="cell-sub" style={{ whiteSpace: 'nowrap' }}>
                      {tglJam(izin.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
