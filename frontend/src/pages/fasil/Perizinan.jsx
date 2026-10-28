import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Eye, FileText, Home } from 'lucide-react';
import { api } from '../../api';
import { useFetch } from '../../lib/hooks';
import { inisial, rentangTgl, waktuRelatif } from '../../lib/format';
import { Badge, Button, EmptyState, ErrorBox, Loading, PageHead, Tabs } from '../../components/ui';
import { BuktiModal } from '../../components/Bukti';
import KeputusanIzin from '../../components/KeputusanIzin';

const TABS = [
  ['menunggu', 'Menunggu'],
  ['disetujui', 'Disetujui'],
  ['ditolak', 'Ditolak'],
];

function KartuIzin({ izin, onBukti, onDone }) {
  const navigate = useNavigate();
  const pending = izin.status === 'menunggu';
  return (
    <div className={`card izin-card ${pending ? 'pending' : ''}`} onClick={() => navigate(`/perizinan/${izin.id}`)}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="row">
          <span className="avatar">{inisial(izin.penghuni.name)}</span>
          <div>
            <div className="strong">{izin.penghuni.name}</div>
            <div className="cell-sub">
              NIM {izin.penghuni.nomorInduk} • diajukan {waktuRelatif(izin.createdAt)}
            </div>
          </div>
        </div>
        <Badge status={izin.status}>{pending ? 'Menunggu Persetujuan' : undefined}</Badge>
      </div>

      <div className="izin-meta">
        <span>
          <Home size={14} /> Kamar {izin.penghuni.kamar}
        </span>
        <span>
          <CalendarDays size={14} /> {rentangTgl(izin.tanggalMulai, izin.tanggalSelesai)}
        </span>
        <span>
          <FileText size={14} /> {izin.jenis}
        </span>
      </div>

      <p>{izin.alasan}</p>
      {izin.status === 'ditolak' && izin.alasanPenolakan && (
        <p className="small" style={{ color: 'var(--danger-text)' }}>
          Alasan penolakan: {izin.alasanPenolakan}
        </p>
      )}

      <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onBukti(izin);
          }}
        >
          <Eye size={16} /> Lihat Bukti
        </Button>
        {pending && <KeputusanIzin izin={izin} size="sm" onDone={onDone} />}
      </div>
    </div>
  );
}

export default function PerizinanFasil() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'menunggu';
  const [bukti, setBukti] = useState(null);
  const q = useFetch(() => api.get('/izin'), []);
  const semua = q.data?.data || [];
  const rows = semua.filter((i) => i.status === tab);

  return (
    <>
      <PageHead title="Perizinan" subtitle="Tinjau dan putuskan pengajuan izin penghuni asrama" />

      <section className="card" style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={(t) => setParams({ tab: t })}
          tabs={TABS.map(([value, label]) => ({ value, label, count: semua.filter((i) => i.status === value).length }))}
        />
      </section>

      {q.error ? (
        <ErrorBox message={q.error} onRetry={q.reload} />
      ) : q.loading && !q.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title="Tidak ada pengajuan">
            {tab === 'menunggu' ? 'Semua pengajuan izin sudah ditinjau.' : 'Belum ada pengajuan dengan status ini.'}
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-2">
          {rows.map((izin) => (
            <KartuIzin
              key={izin.id}
              izin={izin}
              onBukti={setBukti}
              onDone={(status) => {
                q.reload();
                setParams({ tab: status });
              }}
            />
          ))}
        </div>
      )}

      <BuktiModal izin={bukti} open={Boolean(bukti)} onClose={() => setBukti(null)} />
    </>
  );
}
