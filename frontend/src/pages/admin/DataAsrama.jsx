import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, DoorOpen, MapPin, MapPinOff, Plus, TriangleAlert, Users } from 'lucide-react';
import { api } from '../../api';
import { useFetch } from '../../lib/hooks';
import { JENIS_ASRAMA } from '../../lib/format';
import { Button, EmptyState, ErrorBox, Loading, PageHead } from '../../components/ui';
import FormGedung from './FormGedung';

// eslint-disable-next-line react-refresh/only-export-components
export const JENIS_TONE = { putra: 'info', putri: 'warning', internasional: 'success' };

export default function DataAsrama() {
  const navigate = useNavigate();
  const q = useFetch(() => api.get('/asrama'), []);
  const [tambah, setTambah] = useState(false);
  const gedung = q.data?.data || [];

  return (
    <>
      <PageHead title="Gedung & Kamar" subtitle="Kelola gedung asrama, lokasi presensi, dan kamar beserta kapasitasnya">
        <Button onClick={() => setTambah(true)}>
          <Plus size={18} /> Tambah Gedung
        </Button>
      </PageHead>

      {q.error ? (
        <ErrorBox message={q.error} onRetry={q.reload} />
      ) : !q.data ? (
        <Loading />
      ) : gedung.length === 0 ? (
        <div className="card">
          <EmptyState icon={Building2} title="Belum ada gedung asrama">
            Klik “Tambah Gedung” untuk mulai.
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-3">
          {gedung.map((a) => {
            const kapasitas = Number(a.kapasitasTotal);
            const penghuni = Number(a.jumlahPenghuni);
            const persen = kapasitas ? Math.min(100, Math.round((penghuni / kapasitas) * 100)) : 0;
            const adaLokasi = a.latitude != null && a.longitude != null;
            return (
              <button key={a.id} className="card gedung-card" onClick={() => navigate(`/asrama/${a.id}`)}>
                <div className="row between" style={{ width: '100%' }}>
                  <div className="row">
                    <span className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
                      {a.kode}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div className="strong">{a.nama}</div>
                      <span className={`badge tone-${JENIS_TONE[a.jenis]}`}>{JENIS_ASRAMA[a.jenis]}</span>
                    </div>
                  </div>
                </div>

                {Number(a.jumlahKamar) > 0 ? (
                  <div className="gedung-stat">
                    <span>
                      <Users size={15} /> {penghuni} / {kapasitas} penghuni
                    </span>
                    <span>
                      <DoorOpen size={15} /> {a.kamarTerisi} / {a.jumlahKamar} kamar terisi
                    </span>
                  </div>
                ) : (
                  <div className="gedung-stat">
                    <span>
                      <Users size={15} /> {penghuni} penghuni
                    </span>
                    <span style={{ color: 'var(--danger-text)' }}>
                      <TriangleAlert size={15} /> Belum ada kamar terdaftar
                    </span>
                  </div>
                )}
                <div className="progress" style={{ width: '100%', height: 8 }}>
                  <span style={{ width: `${persen}%`, background: persen >= 90 ? 'var(--warning)' : 'var(--primary-2)' }} />
                </div>

                <div className={`small row ${adaLokasi ? 'muted' : ''}`} style={{ gap: 6, color: adaLokasi ? undefined : 'var(--warning-text)' }}>
                  {adaLokasi ? <MapPin size={14} /> : <MapPinOff size={14} />}
                  {adaLokasi ? `Presensi dalam radius ${a.radius} m` : 'Lokasi belum diatur — presensi tidak dibatasi'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tambah && (
        <FormGedung
          onClose={() => setTambah(false)}
          onSaved={(g) => {
            setTambah(false);
            navigate(`/asrama/${g.id}`);
          }}
        />
      )}
    </>
  );
}
