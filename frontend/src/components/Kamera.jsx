import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, ImageOff, LocateFixed, MapPin, RotateCcw, Send, TriangleAlert } from 'lucide-react';
import { hariTanggal, koordinat } from '../lib/format';
import { useBlobUrl } from './Bukti';
import { Button, Loading, Modal } from './ui';

const MIN_LEBAR = 160; // piksel, di bawah ini frame kamera belum benar-benar siap
const linkMaps =(lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// Koordinat + akurasi + tautan ke Google Maps
export function LokasiInfo({ latitude, longitude, akurasi }) {
  if (latitude == null || longitude == null) return <span className="muted">-</span>;
  return (
    <span className="stack" style={{ gap: 2 }}>
      <span className="num">{koordinat(latitude, longitude)}</span>
      {akurasi != null && <span className="cell-sub">Akurasi ±{Math.round(akurasi)} m</span>}
      <a href={linkMaps(latitude, longitude)} target="_blank" rel="noreferrer" className="row small strong" style={{ gap: 4 }}>
        <ExternalLink size={13} /> Buka di Google Maps
      </a>
    </span>
  );
}

// Foto presensi tersimpan di server (butuh token, jadi lewat blob)
export function FotoPresensi({ presensiId, adaFoto }) {
  const { url, error } = useBlobUrl(adaFoto ? `/presensi/${presensiId}/foto` : null);
  if (!adaFoto) {
    return (
      <div className="foto-kosong">
        <ImageOff size={20} /> Tidak ada foto (data lama atau hasil koreksi)
      </div>
    );
  }
  if (error) return <div className="foto-kosong">{error}</div>;
  if (!url) return <Loading text="Memuat foto..." />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="foto-presensi">
      <img src={url} alt="Foto presensi" />
    </a>
  );
}

const PESAN_GPS = {
  1: 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser, lalu coba lagi.',
  2: 'Lokasi tidak dapat ditentukan. Pastikan GPS/Location perangkat aktif.',
  3: 'Pencarian lokasi terlalu lama. Pindah ke tempat terbuka lalu coba lagi.',
};

function pesanKamera(err) {
  if (!window.isSecureContext) return 'Kamera hanya bisa diakses lewat https:// atau http://localhost.';
  if (err?.name === 'NotAllowedError') return 'Izin kamera ditolak. Izinkan akses kamera untuk situs ini di pengaturan browser.';
  if (err?.name === 'NotFoundError') return 'Kamera tidak ditemukan di perangkat ini.';
  if (err?.name === 'NotReadableError') return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
  return 'Kamera tidak dapat dibuka.';
}

// Cetak info presensi di bagian bawah foto, seperti aplikasi kamera bercap waktu
function cetakCap(ctx, w, h, baris) {
  const pad = Math.round(w * 0.03);
  const font = Math.max(14, Math.round(w * 0.028));
  const lineH = Math.round(font * 1.4);
  const tinggi = pad * 2 + lineH * baris.length + Math.round(font * 0.3);
  const atas = h - tinggi;

  const grad = ctx.createLinearGradient(0, atas - pad * 2, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.35, 'rgba(0,0,0,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, atas - pad * 2, w, tinggi + pad * 2);

  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(pad, atas + pad, Math.max(4, Math.round(w * 0.006)), lineH * baris.length);

  ctx.textBaseline = 'top';
  baris.forEach((teks, i) => {
    const bold = i === 0;
    ctx.font = `${bold ? 800 : 600} ${bold ? Math.round(font * 1.15) : font}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = bold ? '#FFFFFF' : 'rgba(255,255,255,0.92)';
    ctx.fillText(teks, pad * 1.8, atas + pad + i * lineH);
  });
}

// Modal kamera untuk presensi: ambil selfie + lokasi GPS, lalu kirim.
// `jam` dan `tanggal` berasal dari jam server yang sudah disinkronkan.
export function KameraPresensi({ open, onClose, onSubmit, sesiLabel, jam, tanggal, user }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [kamera, setKamera] = useState({ status: 'memuat', error: null });
  const [gps, setGps] = useState({ status: 'mencari', coords: null, error: null });
  const [foto, setFoto] = useState(null); // { blob, url, coords }
  const [busy, setBusy] = useState(false);

  const matikanKamera = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  // `masihDipakai` mencegah stream bocor kalau modal sudah ditutup (atau efek
  // dijalankan ulang oleh StrictMode) sebelum izin kamera selesai diproses
  const nyalakanKamera = useCallback(
    async (masihDipakai = () => true) => {
      matikanKamera();
      setKamera({ status: 'memuat', error: null });
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (!masihDipakai()) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        video.current.srcObject = s;
        // status "siap" diset di onLoadedMetadata, saat ukuran video sudah diketahui
      } catch (err) {
        if (masihDipakai()) setKamera({ status: 'error', error: pesanKamera(err) });
      }
    },
    [matikanKamera]
  );

  // kamera & GPS hanya aktif selama modal terbuka
  useEffect(() => {
    if (!open) return;
    let aktif = true;
    setFoto(null);
    nyalakanKamera(() => aktif);

    let watchId;
    if (!navigator.geolocation) {
      setGps({ status: 'error', coords: null, error: 'Perangkat tidak mendukung GPS.' });
    } else {
      setGps({ status: 'mencari', coords: null, error: null });
      watchId = navigator.geolocation.watchPosition(
        (pos) => setGps({ status: 'ok', coords: pos.coords, error: null }),
        (err) => setGps((g) => (g.coords ? g : { status: 'error', coords: null, error: PESAN_GPS[err.code] || err.message })),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }
    return () => {
      aktif = false;
      matikanKamera();
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [open, nyalakanKamera, matikanKamera]);

  // bersihkan object URL foto lama
  useEffect(() => () => foto && URL.revokeObjectURL(foto.url), [foto]);

  const c = gps.coords;
  const baris = [
    `${sesiLabel.toUpperCase()} • ASRAMA UNAND`,
    tanggal ? hariTanggal(tanggal) : '',
    `${jam} WIB`,
    c ? `${koordinat(c.latitude, c.longitude)} (±${Math.round(c.accuracy)} m)` : 'Mencari lokasi...',
    `${user.name} • ${user.nomorInduk || ''}`,
  ];

  // Browser kadang melaporkan ukuran sementara (mis. 2x2) sebelum frame kamera
  // pertama datang; tunggu sampai ukurannya wajar baru dianggap siap.
  const cekSiap = (e) => {
    if (e.currentTarget.videoWidth >= MIN_LEBAR) setKamera({ status: 'siap', error: null });
  };

  const ambil = () => {
    const v = video.current;
    if (v.videoWidth < MIN_LEBAR) return;
    const skala = Math.min(1, 1280 / v.videoWidth);
    const w = Math.round(v.videoWidth * skala);
    const h = Math.round(v.videoHeight * skala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // pratinjau ditampilkan seperti cermin; foto disimpan juga seperti cermin
    // supaya hasilnya sama dengan yang dilihat penghuni
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    ctx.restore();
    cetakCap(ctx, w, h, baris);
    const coords = { latitude: c.latitude, longitude: c.longitude, akurasi: c.accuracy };
    canvas.toBlob((blob) => blob && setFoto({ blob, url: URL.createObjectURL(blob), coords }), 'image/jpeg', 0.85);
  };

  const kirim = async () => {
    setBusy(true);
    try {
      await onSubmit(foto.blob, foto.coords);
    } finally {
      setBusy(false);
    }
  };

  const bisaAmbil = kamera.status === 'siap' && gps.status === 'ok';

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title={`${sesiLabel} — Ambil Foto`}
      subtitle="Pastikan wajah terlihat jelas dan lokasi GPS sudah ditemukan"
      footer={
        foto ? (
          <>
            <Button variant="secondary" onClick={() => setFoto(null)} disabled={busy}>
              <RotateCcw size={16} /> Ulangi
            </Button>
            <Button onClick={kirim} loading={busy}>
              <Send size={16} /> Kirim Presensi
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={ambil} disabled={!bisaAmbil}>
              <Camera size={16} /> Ambil Foto
            </Button>
          </>
        )
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="kamera-frame">
          {/* video tetap terpasang supaya stream tidak terputus saat foto diulang */}
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className="mirror"
            style={{ visibility: foto ? 'hidden' : 'visible' }}
            onLoadedMetadata={cekSiap}
            onResize={cekSiap}
            onPlaying={cekSiap}
          />
          {foto && <img src={foto.url} alt="Hasil foto presensi" />}
          {!foto && kamera.status === 'siap' && (
            <div className="kamera-overlay">
              {baris.map((b, i) => (
                <div key={i} className={i === 0 ? 'strong' : ''}>
                  {b}
                </div>
              ))}
            </div>
          )}
          {kamera.status === 'memuat' && (
            <div className="kamera-pesan">
              <span className="spinner" /> Membuka kamera...
            </div>
          )}
          {kamera.status === 'error' && (
            <div className="kamera-pesan">
              <TriangleAlert size={28} />
              <span>{kamera.error}</span>
              <Button size="sm" variant="secondary" onClick={() => nyalakanKamera()}>
                Coba lagi
              </Button>
            </div>
          )}
        </div>

        <div className={`alert ${gps.status === 'ok' ? 'tone-success' : gps.status === 'error' ? 'tone-danger' : 'tone-muted'}`}>
          {gps.status === 'ok' ? <MapPin size={18} /> : gps.status === 'error' ? <TriangleAlert size={18} /> : <LocateFixed size={18} />}
          <div>
            {gps.status === 'ok' && (
              <>
                <div className="strong">Lokasi ditemukan</div>
                <div className="small num">
                  {koordinat(c.latitude, c.longitude)} • akurasi ±{Math.round(c.accuracy)} m
                </div>
              </>
            )}
            {gps.status === 'mencari' && 'Mencari lokasi GPS... izinkan akses lokasi jika diminta browser.'}
            {gps.status === 'error' && gps.error}
          </div>
        </div>
      </div>
    </Modal>
  );
}
