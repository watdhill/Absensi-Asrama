import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, CircleX, Download, History } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../lib/hooks';
import { rentangTgl, tglJam, tglPanjang } from '../lib/format';
import { FileCard, useBlobUrl } from '../components/Bukti';
import { Badge, Button, ConfirmDialog, ErrorBox, Field, Loading, Modal } from '../components/ui';

const ALASAN_MAX = 500;

// jumlah hari dalam rentang izin, inklusif
const jumlahHari = (mulai, selesai) =>
  Math.round((new Date(`${selesai}T00:00:00Z`) - new Date(`${mulai}T00:00:00Z`)) / 86400000) + 1;

function PratinjauBukti({ izin }) {
  const { url, error } = useBlobUrl(`/izin/${izin.id}/bukti`);
  const pdf = izin.buktiTipe?.includes('pdf');

  return (
    <div className="stack" style={{ gap: 12 }}>
      <FileCard
        name={izin.buktiNama}
        type={izin.buktiTipe}
        size={izin.buktiUkuran}
        onView={url ? () => window.open(url, '_blank', 'noopener') : undefined}
      />
      <div className="preview-frame">
        {error ? (
          <span className="muted">{error}</span>
        ) : !url ? (
          <Loading text="Memuat bukti..." />
        ) : pdf ? (
          <iframe src={url} title="Bukti izin" />
        ) : (
          <img src={url} alt={`Bukti izin ${izin.buktiNama}`} />
        )}
      </div>
      {url && (
        <a className="btn btn-sm btn-secondary" href={url} download={izin.buktiNama} style={{ alignSelf: 'flex-start' }}>
          <Download size={16} /> Unduh Bukti
        </a>
      )}
    </div>
  );
}

function TolakModal({ open, onClose, onSubmit }) {
  const [alasan, setAlasan] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const kirim = async () => {
    const a = alasan.trim();
    if (!a) return setError('Alasan penolakan wajib diisi');
    setBusy(true);
    try {
      await onSubmit(a);
      setAlasan('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Tolak Pengajuan Izin"
      subtitle="Alasan penolakan akan ditampilkan kepada penghuni"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant="danger" onClick={kirim} loading={busy}>
            <CircleX size={16} /> Tolak Izin
          </Button>
        </>
      }
    >
      <Field label="Alasan Penolakan" required error={error} hint={`${alasan.trim().length}/${ALASAN_MAX} karakter`}>
        <textarea
          className={`textarea ${error ? 'invalid' : ''}`}
          value={alasan}
          maxLength={ALASAN_MAX}
          autoFocus
          placeholder="Contoh: Bukti yang dilampirkan tidak terbaca, silakan ajukan ulang dengan bukti yang jelas."
          onChange={(e) => {
            setAlasan(e.target.value);
            setError('');
          }}
        />
      </Field>
    </Modal>
  );
}

export default function DetailIzin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const q = useFetch(() => api.get(`/izin/${id}`), [id]);
  const [setujui, setSetujui] = useState(false);
  const [tolak, setTolak] = useState(false);

  const kembali = (
    <button className="back-link" onClick={() => navigate('/perizinan')}>
      <ArrowLeft size={16} /> Kembali ke Perizinan
    </button>
  );

  if (q.error)
    return (
      <>
        {kembali}
        <ErrorBox message={q.error} onRetry={q.reload} />
      </>
    );
  if (!q.data) return <Loading />;

  const izin = q.data.data;
  const p = izin.penghuni;
  const peninjau = user.role === 'fasil' || user.role === 'admin';
  const bisaPutuskan = peninjau && izin.status === 'menunggu';

  const putuskan = async (aksi, body) => {
    try {
      const res = await api.put(`/izin/${izin.id}/${aksi}`, body);
      toast.success(res.message);
      setSetujui(false);
      setTolak(false);
      q.reload();
    } catch (err) {
      toast.error(err.message);
      setSetujui(false);
      setTolak(false);
      q.reload(); // misal sudah diputuskan fasil lain -> tampilkan status terbaru
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {kembali}

      <div className="grid grid-main">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>{izin.jenis}</h2>
                <div className="card-sub">Diajukan {tglJam(izin.createdAt)}</div>
              </div>
              <Badge status={izin.status} />
            </div>
            <div className="card-pad stack">
              <dl className="info-list">
                {peninjau && (
                  <>
                    <dt>Nama</dt>
                    <dd>{p.name}</dd>
                    <dt>NIM</dt>
                    <dd>{p.nomorInduk || '-'}</dd>
                    <dt>Asrama / Kamar</dt>
                    <dd>
                      {p.Asrama?.nama || '-'} • {p.kamar || '-'}
                    </dd>
                    {p.telepon && (
                      <>
                        <dt>Telepon</dt>
                        <dd>{p.telepon}</dd>
                      </>
                    )}
                  </>
                )}
                <dt>Tanggal Izin</dt>
                <dd>
                  {izin.tanggalMulai === izin.tanggalSelesai
                    ? tglPanjang(izin.tanggalMulai)
                    : `${rentangTgl(izin.tanggalMulai, izin.tanggalSelesai)}`}{' '}
                  <span className="muted">({jumlahHari(izin.tanggalMulai, izin.tanggalSelesai)} hari)</span>
                </dd>
                <dt>Alasan</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{izin.alasan}</dd>
              </dl>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Bukti Pendukung</h2>
            </div>
            <div className="card-pad">
              <PratinjauBukti izin={izin} />
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Keputusan</h2>
            </div>
            <div className="card-pad stack">
              {izin.status === 'menunggu' ? (
                <>
                  <p className="muted">
                    {peninjau
                      ? 'Periksa bukti sebelum memutuskan. Keputusan bersifat final dan tidak dapat diubah.'
                      : 'Pengajuan Anda sedang menunggu peninjauan fasilitator asrama.'}
                  </p>
                  {bisaPutuskan && (
                    <>
                      <Button variant="success" block onClick={() => setSetujui(true)}>
                        <CircleCheck size={16} /> Setujui
                      </Button>
                      <Button variant="danger-outline" block onClick={() => setTolak(true)}>
                        <CircleX size={16} /> Tolak
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className={`alert tone-${izin.status === 'disetujui' ? 'success' : 'danger'}`}>
                    {izin.status === 'disetujui' ? <CircleCheck size={18} /> : <CircleX size={18} />}
                    <div>
                      {izin.status === 'disetujui'
                        ? 'Izin disetujui. Presensi pada rentang tanggal ini tercatat sebagai Izin.'
                        : 'Izin ditolak.'}
                    </div>
                  </div>
                  {izin.status === 'ditolak' && (
                    <div>
                      <div className="label">Alasan Penolakan</div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{izin.alasanPenolakan}</p>
                    </div>
                  )}
                  <div className="audit-note">
                    <History size={16} />
                    Diputuskan oleh {izin.reviewer?.name || '-'} • {tglJam(izin.reviewedAt)}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={setujui}
        onClose={() => setSetujui(false)}
        onConfirm={() => putuskan('setujui')}
        icon={CircleCheck}
        tone="success"
        title="Setujui izin ini?"
        message={`${p.name} akan tercatat Izin pada ${rentangTgl(izin.tanggalMulai, izin.tanggalSelesai)}. Keputusan tidak dapat diubah.`}
        confirmLabel="Setujui"
      />
      <TolakModal open={tolak} onClose={() => setTolak(false)} onSubmit={(alasan) => putuskan('tolak', { alasan })} />
    </div>
  );
}
