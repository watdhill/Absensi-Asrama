import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, CircleX, Clock, Eye } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../lib/hooks';
import { inisial, tglJam, tglPanjang } from '../lib/format';
import { Badge, Button, ErrorBox, Loading } from '../components/ui';
import { BuktiModal, BuktiPreview, FileCard } from '../components/Bukti';
import KeputusanIzin from '../components/KeputusanIzin';

const PESAN_STATUS = {
  menunggu: ['tone-warning', Clock, 'Menunggu persetujuan fasil.'],
  disetujui: ['tone-success', CircleCheck, '✓ Pengajuan izin disetujui'],
  ditolak: ['tone-danger', CircleX, 'Pengajuan izin ditolak'],
};

export default function DetailIzin() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lihatBukti, setLihatBukti] = useState(false);
  const q = useFetch(() => api.get(`/izin/${id}`), [id]);
  const reviewer = user.role !== 'penghuni';

  const kembali = (
    <button className="back-link" onClick={() => navigate('/perizinan')}>
      <ArrowLeft size={16} /> Kembali ke Perizinan
    </button>
  );

  if (q.error) return <>{kembali}<ErrorBox message={q.error} /></>;
  if (!q.data) return <Loading />;

  const izin = q.data.data;
  const [tone, Icon, pesan] = PESAN_STATUS[izin.status];
  const p = izin.penghuni;

  return (
    <>
      {kembali}
      <div className="page-head">
        <div>
          <h1>Detail Pengajuan Izin</h1>
          <p>Diajukan {tglJam(izin.createdAt)}</p>
        </div>
        <Badge status={izin.status}>{izin.status === 'menunggu' ? 'Menunggu Persetujuan' : undefined}</Badge>
      </div>

      <div className={`alert ${tone}`} style={{ marginBottom: 20 }}>
        <Icon size={18} />
        <div>
          <div className="strong">{pesan}</div>
          {izin.status === 'ditolak' && izin.alasanPenolakan && (
            <div style={{ marginTop: 2 }}>Alasan: {izin.alasanPenolakan}</div>
          )}
          {izin.reviewer && (
            <div className="small" style={{ marginTop: 2, opacity: 0.85 }}>
              Diputuskan oleh {izin.reviewer.name} • {tglJam(izin.reviewedAt)}
            </div>
          )}
        </div>
      </div>

      <div className={`grid ${reviewer ? 'grid-2' : 'grid-main'}`} style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-head">
            <h2>{reviewer ? 'Informasi Penghuni' : 'Informasi Pengajuan'}</h2>
          </div>
          <div className="card-pad stack">
            {reviewer && (
              <div className="row">
                <span className="avatar" style={{ width: 48, height: 48 }}>
                  {inisial(p.name)}
                </span>
                <div>
                  <div className="strong" style={{ fontSize: 16 }}>
                    {p.name}
                  </div>
                  <div className="muted">
                    {p.Asrama?.nama} • Kamar {p.kamar}
                  </div>
                </div>
              </div>
            )}
            <dl className="info-list">
              {reviewer && (
                <>
                  <dt>Nama</dt>
                  <dd>{p.name}</dd>
                  <dt>NIM</dt>
                  <dd>{p.nomorInduk}</dd>
                  <dt>Kamar</dt>
                  <dd>{p.kamar}</dd>
                </>
              )}
              <dt>Jenis Izin</dt>
              <dd>{izin.jenis}</dd>
              <dt>Tanggal Mulai</dt>
              <dd>{tglPanjang(izin.tanggalMulai)}</dd>
              <dt>Tanggal Selesai</dt>
              <dd>{tglPanjang(izin.tanggalSelesai)}</dd>
              <dt>Alasan</dt>
              <dd style={{ fontWeight: 500 }}>{izin.alasan}</dd>
              <dt>Tanggal Pengajuan</dt>
              <dd>{tglJam(izin.createdAt)}</dd>
            </dl>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Bukti Izin</h2>
            {reviewer && (
              <Button variant="secondary" size="sm" onClick={() => setLihatBukti(true)}>
                <Eye size={16} /> Lihat Bukti
              </Button>
            )}
          </div>
          <div className="card-pad stack" style={{ gap: 14 }}>
            <FileCard
              name={izin.buktiNama}
              type={izin.buktiTipe}
              size={izin.buktiUkuran}
              onView={reviewer ? undefined : () => setLihatBukti(true)}
            />
            {reviewer && <BuktiPreview izin={izin} />}
          </div>
        </section>
      </div>

      {reviewer && izin.status === 'menunggu' && (
        <div className="card card-pad row between wrap" style={{ marginTop: 20 }}>
          <div>
            <div className="strong">Tinjau pengajuan ini</div>
            <div className="muted small">Periksa bukti izin sebelum menyetujui atau menolak.</div>
          </div>
          <div className="row">
            <KeputusanIzin izin={izin} onDone={(status) => navigate(`/perizinan?tab=${status}`)} />
          </div>
        </div>
      )}

      <BuktiModal izin={izin} open={lihatBukti} onClose={() => setLihatBukti(false)} />
    </>
  );
}
