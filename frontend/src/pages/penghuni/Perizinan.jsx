import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, FileText, Plus } from 'lucide-react';
import { api } from '../../api';
import { useFetch } from '../../lib/hooks';
import { rentangTgl, tglJam } from '../../lib/format';
import { Badge, EmptyState, ErrorBox, Loading, PageHead, Tabs } from '../../components/ui';

const TAB_IZIN = [
  ['', 'Semua'],
  ['menunggu', 'Menunggu'],
  ['disetujui', 'Disetujui'],
  ['ditolak', 'Ditolak'],
];

export default function PerizinanPenghuni() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const q = useFetch(() => api.get('/izin', { status }), [status]);

  const rows = q.data?.data || [];
  const jumlah = q.data?.jumlah;

  return (
    <>
      <PageHead title="Perizinan" subtitle="Ajukan izin tidak hadir dan pantau status pengajuan Anda">
        <Link to="/perizinan/ajukan" className="btn btn-primary">
          <Plus size={18} /> Ajukan Izin
        </Link>
      </PageHead>

      <div style={{ marginBottom: 16 }}>
        <Tabs
          tabs={TAB_IZIN.map(([value, label]) => ({ value, label, count: jumlah?.[value || 'semua'] }))}
          value={status}
          onChange={setStatus}
        />
      </div>

      {q.error ? (
        <ErrorBox message={q.error} onRetry={q.reload} />
      ) : q.loading && !q.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title={status ? 'Tidak ada pengajuan dengan status ini' : 'Belum ada pengajuan izin'}>
            {!status && 'Ajukan izin jika Anda tidak dapat mengikuti presensi.'}
          </EmptyState>
        </div>
      ) : (
        <div className="stack">
          {rows.map((izin) => (
            <div
              key={izin.id}
              className={`card izin-card ${izin.status === 'menunggu' ? 'pending' : ''}`}
              onClick={() => navigate(`/perizinan/${izin.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/perizinan/${izin.id}`)}
            >
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="strong" style={{ fontSize: 16 }}>
                  {izin.jenis}
                </div>
                <Badge status={izin.status} />
              </div>
              <div className="izin-meta">
                <span>
                  <CalendarDays size={14} /> {rentangTgl(izin.tanggalMulai, izin.tanggalSelesai)}
                </span>
                <span>
                  <Clock size={14} /> Diajukan {tglJam(izin.createdAt)}
                </span>
              </div>
              <p className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {izin.alasan}
              </p>
              {izin.status === 'ditolak' && izin.alasanPenolakan && (
                <div className="alert tone-danger small">Alasan penolakan: {izin.alasanPenolakan}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
