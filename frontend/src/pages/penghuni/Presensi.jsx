import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheck, Fingerprint, Info } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { hariTanggal, jamMenit, tglPanjang } from '../../lib/format';
import { Badge, Button, ConfirmDialog, ErrorBox, Loading } from '../../components/ui';
import { Countdown, Indikator, useSesiHariIni } from './sesi';

// Sesi yang ditampilkan: yang sedang dibuka, kalau tidak ada yang berikutnya,
// kalau sudah lewat semua yang terakhir.
function pilihSesi(sesi) {
  return sesi.find((s) => s.state === 'dibuka') || sesi.find((s) => s.state === 'belum_dibuka') || sesi[sesi.length - 1];
}

export default function Presensi() {
  const navigate = useNavigate();
  const toast = useToast();
  const hariIni = useSesiHariIni();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [hasil, setHasil] = useState(null);

  if (hariIni.error) return <ErrorBox message={hariIni.error} onRetry={hariIni.reload} />;
  if (hariIni.loading) return <Loading />;

  if (hasil) {
    return (
      <div className="card presensi-panel">
        <div className="success-check">
          <CircleCheck size={60} strokeWidth={2.2} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Presensi Berhasil</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Presensi {hasil.sesi} berhasil dicatat
        </p>
        <p className="strong" style={{ margin: '18px 0 28px', fontSize: 16 }}>
          {tglPanjang(hasil.tanggal)} • {jamMenit(hasil.waktu)} WIB
        </p>
        <Button size="lg" onClick={() => navigate('/dashboard')}>
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const sesi = pilihSesi(hariIni.sesi);
  const sudah = sesi.status === 'hadir';
  const bisa = sesi.state === 'dibuka' && sesi.status === 'belum';

  const presensi = async () => {
    try {
      const res = await api.post('/presensi');
      setKonfirmasi(false);
      setHasil(res.data);
      toast.success('Presensi berhasil dicatat');
    } catch (err) {
      setKonfirmasi(false);
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
        <Button size="xl" disabled={!bisa} onClick={() => setKonfirmasi(true)}>
          <Fingerprint size={24} /> PRESENSI SEKARANG
        </Button>
      )}

      <p className="row muted small" style={{ justifyContent: 'center', marginTop: 24 }}>
        <Info size={14} /> Presensi hanya dapat dilakukan selama waktu yang telah ditentukan.
      </p>

      <ConfirmDialog
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        onConfirm={presensi}
        icon={Fingerprint}
        title="Konfirmasi Presensi"
        message={`Apakah Anda yakin ingin melakukan ${sesi.label.toLowerCase()} sekarang?`}
        confirmLabel="Ya, Presensi"
      />
    </div>
  );
}
