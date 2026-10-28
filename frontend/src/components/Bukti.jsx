import { useEffect, useRef, useState } from 'react';
import { Eye, FileImage, FileText, Upload, X } from 'lucide-react';
import { api } from '../api';
import { tipeFile, ukuranFile } from '../lib/format';
import { Loading, Modal } from './ui';

const MAX_UKURAN = 5 * 1024 * 1024;
const TIPE_OK = ['image/jpeg', 'image/png', 'application/pdf'];

export function FileCard({ name, type, size, onView, onRemove }) {
  const pdf = type?.includes('pdf');
  const Icon = pdf ? FileText : FileImage;
  return (
    <div className="file-card">
      <div className={`file-card-icon ${pdf ? 'tone-danger' : 'tone-info'}`}>
        <Icon size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="file-card-name">{name}</div>
        <div className="cell-sub">
          {tipeFile(type)} • {ukuranFile(size)}
        </div>
      </div>
      {onView && (
        <button type="button" className="btn btn-sm btn-secondary" onClick={onView}>
          <Eye size={16} /> Lihat
        </button>
      )}
      {onRemove && (
        <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={onRemove} aria-label="Hapus file">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// Komponen upload bukti: klik atau seret file, validasi format & ukuran
export function FileUpload({ value, onChange, error, onError }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);

  const pilih = (file) => {
    if (!file) return;
    if (!TIPE_OK.includes(file.type)) return onError('Format file harus JPG, PNG, atau PDF');
    if (file.size > MAX_UKURAN) return onError('Ukuran file maksimal 5 MB');
    onChange(file);
  };

  if (value) {
    return <FileCard name={value.name} type={value.type} size={value.size} onRemove={() => onChange(null)} />;
  }

  return (
    <>
      <div
        className={`dropzone ${drag ? 'drag' : ''} ${error ? 'invalid' : ''}`}
        onClick={() => input.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pilih(e.dataTransfer.files[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
      >
        <div className="dropzone-icon tone-primary">
          <Upload size={22} />
        </div>
        <div className="strong">
          <span style={{ color: 'var(--primary-2)' }}>Upload Bukti</span> atau seret file ke sini
        </div>
        <div className="field-hint" style={{ marginTop: 4 }}>
          Format JPG atau PDF • Maksimal 5 MB
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        hidden
        onChange={(e) => {
          pilih(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}

// Ambil file bukti (butuh token) lalu jadikan object URL
function useBuktiUrl(izinId, aktif = true) {
  const [state, setState] = useState({ url: null, error: null });
  useEffect(() => {
    if (!aktif) return;
    let url;
    let alive = true;
    api
      .blob(`/izin/${izinId}/bukti`)
      .then((b) => {
        url = URL.createObjectURL(b);
        if (alive) setState({ url, error: null });
      })
      .catch((err) => alive && setState({ url: null, error: err.message }));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [izinId, aktif]);
  return state;
}

export function BuktiPreview({ izin, aktif = true }) {
  const { url, error } = useBuktiUrl(izin.id, aktif);
  const pdf = izin.buktiTipe?.includes('pdf');
  return (
    <div className="preview-frame">
      {error ? (
        <div className="muted">{error}</div>
      ) : !url ? (
        <Loading text="Memuat dokumen..." />
      ) : pdf ? (
        <iframe src={url} title={izin.buktiNama} />
      ) : (
        <img src={url} alt={`Bukti izin ${izin.buktiNama}`} />
      )}
    </div>
  );
}

export function BuktiModal({ izin, open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Bukti Izin" size="xl" subtitle={izin && `${izin.buktiNama} • ${tipeFile(izin.buktiTipe)} • ${ukuranFile(izin.buktiUkuran)}`}>
      {izin && <BuktiPreview izin={izin} aktif={open} />}
    </Modal>
  );
}
