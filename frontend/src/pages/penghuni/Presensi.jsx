import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CircleCheck, Info } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hariTanggal, jamMenit, SESI_LABEL, tglPanjang } from '../../lib/format';
import { Badge, Button, ErrorBox, Loading } from '../../components/ui';
import { KameraPresensi, LokasiInfo } from '../../components/Kamera';
import { Countdown, Indikator, useSesiHariIni } from './sesi';

// Sesi yang ditampilkan: yang sedang dibuka, kalau tidak ada yang berikutnya,
// kalau sudah lewat semua yang terakhir.
function pilihSesi(sesi) {
  return sesi.find((s) => s.state === 'dibuka') || sesi.find((s) => s.state === 'belum_dibuka') || sesi[sesi.length - 1];
}

function HasilPresensi({ hasil }) {
  const navigate = useNavigate();
  return (
    <div className="card presensi-panel" style={{ maxWidth: 720 }}>
      <div className="success-check" style={{ width: 80, height: 80 }}>
        <CircleCheck size={48} strokeWidth={2.2} />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800 }}>Presensi Berhasil</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Presensi {hasil.sesi} berhasil dicatat
      </p>

      <div className="grid grid-2" style={{ textAlign: 'left', margin: '24px 0 28px', alignItems: 'start' }}>
        <img src={hasil.fotoUrl} alt="Foto presensi" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
        <dl className="info-list" style={{ gridTemplateColumns: '90px 1fr' }}>
          <dt>Sesi</dt>
          <dd>Presensi {SESI_LABEL[hasil.sesi]}</dd>
          <dt>Tanggal</dt>
          <dd>{tglPanjang(hasil.tanggal)}</dd>
          <dt>Jam</dt>
          <dd>{jamMenit(hasil.waktu)} WIB</dd>
          <dt>Lokasi</dt>
          <dd>
            <LokasiInfo latitude={hasil.latitude} longitude={hasil.longitude} akurasi={hasil.akurasi} />
          </dd>
        </dl>
      </div>

      <Button size="lg" onClick={() => navigate('/dashboard')}>
        Kembali ke Dashboard
      </Button>
    </div>
  );
}

export default function Presensi() {
  const { user } = useAuth();
  const toast = useToast();
  const hariIni = useSesiHariIni();
  const [kamera, setKamera] = useState(false);
  const [hasil, setHasil] = useState(null);

  // object URL foto hasil dilepas saat halaman ditinggalkan
  useEffect(() => () => hasil && URL.revokeObjectURL(hasil.fotoUrl), [hasil]);

  if (hariIni.error) return <ErrorBox message={hariIni.error} onRetry={hariIni.reload} />;
  if (hariIni.loading) return <Loading />;
  if (hasil) return <HasilPresensi hasil={hasil} />;

  const sesi = pilihSesi(hariIni.sesi);
  const sudah = sesi.status === 'hadir';
  const bisa = sesi.state === 'dibuka' && sesi.status === 'belum';

  const kirim = async (blob, coords) => {
    const data = new FormData();
    data.append('foto', blob, `presensi-${sesi.sesi}.jpg`);
    data.append('latitude', coords.latitude);
    data.append('longitude', coords.longitude);
    data.append('akurasi', coords.akurasi);
    try {
      const res = await api.post('/presensi', data);
      setKamera(false);
      setHasil({ ...res.data, fotoUrl: URL.createObjectURL(blob) });
      toast.success('Presensi berhasil dicatat');
    } catch (err) {
      setKamera(false);
      toast.error(err.message);
      hariIni.reload();
    }
  };

  return (
    <div className="card presensi-panel">
      <div className="row" style={{ justifyContent: 'center', marginBottom: 6 }}>
        <Badge status={sesi.status} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>{sesi.label}</h1>
      <p className="muted strong" style={{ fontSize: 16 }}>
        {sesi.mulai.replace(':', '.')} – {sesi.selesai.replace(':', '.')} WIB
      </p>

      <div className="big-clock" aria-live="off">
        {hariIni.jam}
      </div>
      <p className="muted">{hariTanggal(hariIni.tanggal)}</p>

      <div className="stack" style={{ alignItems: 'center', gap: 6, margin: '22px 0 26px' }}>
        <div className="row">
          <span className="muted">Status:</span>
          <Indikator sesi={sesi} />
        </div>
        {!sudah && <Countdown sesi={sesi} />}
      </div>

      {sudah ? (
        <div className="done-box" style={{ justifyContent: 'center', maxWidth: 360, margin: '0 auto' }}>
          <CircleCheck size={20} /> Anda sudah presensi pukul {jamMenit(sesi.waktu)} WIB
        </div>
      ) : (
        <Button size="xl" disabled={!bisa} onClick={() => setKamera(true)}>
          <Camera size={24} /> PRESENSI SEKARANG
        </Button>
      )}

      <p className="row muted small" style={{ justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
        <Info size={14} /> Presensi memakai foto dari kamera dan lokasi GPS, hanya selama waktu yang telah ditentukan.
      </p>

      <KameraPresensi
        open={kamera}
        onClose={() => setKamera(false)}
        onSubmit={kirim}
        sesiLabel={sesi.label}
        jam={hariIni.jam}
        tanggal={hariIni.tanggal}
        user={user}
      />
    </div>
  );
}
