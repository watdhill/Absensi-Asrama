import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheck, Clock, Fingerprint } from 'lucide-react';
import { api } from '../../api';
import { useElapsed, useFetch } from '../../lib/hooks';
import { durasi, jamMenit, SESI_LABEL, tglPanjang } from '../../lib/format';
import { Badge, Button, Modal } from '../../components/ui';
import { FotoPresensi, LokasiInfo } from '../../components/Kamera';

const tambahDetik = (jam, detik) => {
  const [h, m, s] = jam.split(':').map(Number);
  return durasi((h * 3600 + m * 60 + s + detik) % 86400);
};

// Status sesi presensi hari ini dari server + hitung mundur di browser.
// Saat sesi dibuka/berakhir, data diambil ulang supaya statusnya ikut berubah.
// eslint-disable-next-line react-refresh/only-export-components
export function useSesiHariIni() {
  const q = useFetch(() => api.get('/presensi/hari-ini'), []);
  const data = q.data?.data;
  const elapsed = useElapsed(q.data);
  const sudahReload = useRef(null);

  const sesi = (data?.sesi || []).map((s) => ({
    ...s,
    sisa: s.sisaDetik - elapsed,
    mulaiDalam: s.mulaiDalamDetik - elapsed,
  }));
  const lewatBatas = sesi.some(
    (s) => (s.state === 'dibuka' && s.sisa <= 0) || (s.state === 'belum_dibuka' && s.mulaiDalam <= 0)
  );

  const { reload } = q;
  useEffect(() => {
    if (lewatBatas && sudahReload.current !== q.data) {
      sudahReload.current = q.data;
      reload();
    }
  }, [lewatBatas, q.data, reload]);

  return {
    loading: q.loading && !data,
    error: q.error,
    reload,
    tanggal: data?.tanggal,
    jam: data ? tambahDetik(data.jam, elapsed) : '--:--:--',
    sesi,
    sesiAktif: data?.sesiAktif,
  };
}

const INDIKATOR = {
  dibuka: ['on', 'Presensi sedang dibuka'],
  belum_dibuka: ['off', 'Presensi belum dibuka'],
  berakhir: ['ended', 'Presensi telah berakhir'],
};

export function Indikator({ sesi }) {
  const [cls, teks] = INDIKATOR[sesi.state];
  return (
    <span className={`indicator ${cls}`}>
      <i /> {teks}
    </span>
  );
}

export function Countdown({ sesi }) {
  if (sesi.state === 'dibuka') {
    return (
      <span className="muted">
        Berakhir dalam <span className="countdown" style={{ color: 'var(--text)' }}>{durasi(sesi.sisa)}</span>
      </span>
    );
  }
  if (sesi.state === 'belum_dibuka') {
    return (
      <span className="muted">
        Dibuka dalam <span className="countdown">{durasi(sesi.mulaiDalam)}</span>
      </span>
    );
  }
  return null;
}

// Kartu satu sesi di dashboard penghuni
export function SesiCard({ sesi, onDetail }) {
  const navigate = useNavigate();
  const sudah = sesi.status === 'hadir';
  const cls = sudah ? 'done' : sesi.state === 'dibuka' ? 'open' : '';

  return (
    <div className={`session-card ${cls}`}>
      <div className="row between">
        <div className="row">
          <div className={`stat-icon ${sesi.sesi === 'pagi' ? 'tone-warning' : 'tone-primary'}`}>
            <Clock size={22} />
          </div>
          <div>
            <div className="strong">{sesi.label}</div>
            <div className="muted small">Waktu presensi</div>
          </div>
        </div>
        <Badge status={sesi.status} />
      </div>

      <div className="session-time">
        {sesi.mulai.replace(':', '.')} – {sesi.selesai.replace(':', '.')}
      </div>

      <div className="row between wrap">
        <Indikator sesi={sesi} />
        {!sudah && <Countdown sesi={sesi} />}
      </div>

      {sudah ? (
        <>
          <div className="done-box">
            <CircleCheck size={20} /> Sudah Presensi • {jamMenit(sesi.waktu)} WIB
          </div>
          <Button variant="secondary" block onClick={() => onDetail(sesi)}>
            Lihat Detail
          </Button>
        </>
      ) : sesi.state === 'dibuka' && sesi.status === 'belum' ? (
        <Button size="lg" block onClick={() => navigate('/presensi')}>
          <Fingerprint size={20} /> Presensi Sekarang
        </Button>
      ) : (
        <Button size="lg" block disabled>
          {sesi.status === 'izin' ? 'Sedang Izin' : sesi.state === 'berakhir' ? 'Presensi Ditutup' : 'Belum Dibuka'}
        </Button>
      )}
    </div>
  );
}

// Modal detail satu entri presensi (dipakai dashboard & riwayat)
export function DetailPresensiModal({ item, onClose }) {
  return (
    <Modal open={Boolean(item)} onClose={onClose} title="Detail Presensi" footer={<Button onClick={onClose}>Tutup</Button>}>
      {item && (
        <div className="stack" style={{ gap: 16 }}>
          {item.presensiId && <FotoPresensi presensiId={item.presensiId} adaFoto={item.adaFoto} />}
          <dl className="info-list">
            <dt>Tanggal</dt>
            <dd>{tglPanjang(item.tanggal)}</dd>
            <dt>Sesi</dt>
            <dd>Presensi {SESI_LABEL[item.sesi]}</dd>
            <dt>Waktu Presensi</dt>
            <dd>{item.waktu ? `${jamMenit(item.waktu)} WIB` : '-'}</dd>
            <dt>Status</dt>
            <dd>
              <Badge status={item.status} />
            </dd>
            {item.presensiId && (
              <>
                <dt>Lokasi</dt>
                <dd>
                  <LokasiInfo latitude={item.latitude} longitude={item.longitude} akurasi={item.akurasi} />
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </Modal>
  );
}
