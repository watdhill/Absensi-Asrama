import { useState } from 'react';
import { ExternalLink, LocateFixed } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { JENIS_ASRAMA } from '../../lib/format';
import { Button, Field, Modal } from '../../components/ui';

const KOSONG = { nama: '', kode: '', jenis: '', latitude: '', longitude: '', radius: 200 };

// Modal tambah / edit gedung, termasuk titik lokasi & radius geofence presensi
export default function FormGedung({ gedung, onClose, onSaved }) {
  const toast = useToast();
  const edit = Boolean(gedung?.id);
  const [form, setForm] = useState(() => (edit ? Object.fromEntries(Object.keys(KOSONG).map((k) => [k, gedung[k] ?? ''])) : KOSONG));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [mencari, setMencari] = useState(false);
  // kode jadi awalan nomor kamar, jadi dikunci kalau gedung sudah dipakai
  const kodeTerkunci = edit && (Number(gedung.jumlahKamar) > 0 || Number(gedung.jumlahPenghuni) > 0);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: undefined });
  };

  const pakaiLokasiSaya = () => {
    if (!navigator.geolocation) return toast.error('Perangkat tidak mendukung GPS');
    setMencari(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        toast.success(`Lokasi diambil (akurasi ±${Math.round(pos.coords.accuracy)} m)`);
        setMencari(false);
      },
      (err) => {
        toast.error(err.code === 1 ? 'Izin lokasi ditolak browser' : 'Lokasi tidak dapat ditentukan');
        setMencari(false);
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const simpan = async () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama gedung wajib diisi';
    if (!/^[A-Za-z]{1,3}$/.test(String(form.kode).trim())) e.kode = 'Kode berupa 1–3 huruf, misal A';
    if (!form.jenis) e.jenis = 'Pilih jenis gedung';
    const adaLat = String(form.latitude).trim() !== '';
    const adaLng = String(form.longitude).trim() !== '';
    if (adaLat !== adaLng) e.latitude = 'Isi latitude dan longitude sekaligus, atau kosongkan keduanya';
    if (adaLat && (isNaN(form.latitude) || Math.abs(form.latitude) > 90)) e.latitude = 'Latitude antara -90 dan 90';
    if (adaLng && (isNaN(form.longitude) || Math.abs(form.longitude) > 180)) e.longitude = 'Longitude antara -180 dan 180';
    if (!(Number(form.radius) >= 20 && Number(form.radius) <= 5000)) e.radius = 'Radius 20–5000 meter';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const body = { ...form, nama: form.nama.trim(), radius: Number(form.radius) };
      const res = edit ? await api.put(`/asrama/${gedung.id}`, body) : await api.post('/asrama', body);
      toast.success(res.message);
      onSaved(res.data);
    } catch (err) {
      toast.error(err.message);
      if (/kode/i.test(err.message)) setErrors({ kode: err.message });
      else if (/nama/i.test(err.message)) setErrors({ nama: err.message });
    } finally {
      setBusy(false);
    }
  };

  const err = (k) => (errors[k] ? 'invalid' : '');
  const adaTitik = form.latitude !== '' && form.longitude !== '' && !isNaN(form.latitude) && !isNaN(form.longitude);

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      size="lg"
      title={edit ? `Edit ${gedung.nama}` : 'Tambah Gedung Asrama'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={simpan} loading={busy}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 18 }}>
        <div className="form-grid">
          <Field label="Nama Gedung" required error={errors.nama} className="span-2">
            <input className={`input ${err('nama')}`} value={form.nama} onChange={set('nama')} placeholder="Contoh: Asrama Putri G" />
          </Field>
          <Field
            label="Kode"
            required
            error={errors.kode}
            hint={kodeTerkunci ? 'Terkunci karena gedung sudah punya kamar/penghuni' : 'Awalan nomor kamar, misal A → A-101'}
          >
            <input
              className={`input ${err('kode')}`}
              value={form.kode}
              onChange={(e) => set('kode')({ target: { value: e.target.value.toUpperCase() } })}
              maxLength={3}
              disabled={kodeTerkunci}
            />
          </Field>
          <Field label="Jenis" required error={errors.jenis}>
            <select className={`select ${err('jenis')}`} value={form.jenis} onChange={set('jenis')}>
              <option value="">Pilih jenis gedung</option>
              {Object.entries(JENIS_ASRAMA).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <div className="row between wrap" style={{ marginBottom: 10 }}>
            <div>
              <div className="label">Lokasi & Radius Presensi</div>
              <div className="field-hint">Penghuni hanya bisa presensi dalam radius ini dari titik gedung.</div>
            </div>
            <Button variant="secondary" size="sm" onClick={pakaiLokasiSaya} loading={mencari}>
              <LocateFixed size={16} /> Pakai lokasi saya
            </Button>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <Field label="Latitude" error={errors.latitude}>
              <input className={`input ${err('latitude')}`} value={form.latitude} onChange={set('latitude')} placeholder="-0.914500" inputMode="decimal" />
            </Field>
            <Field label="Longitude" error={errors.longitude}>
              <input className={`input ${err('longitude')}`} value={form.longitude} onChange={set('longitude')} placeholder="100.460200" inputMode="decimal" />
            </Field>
            <Field label="Radius (meter)" required error={errors.radius}>
              <input className={`input ${err('radius')}`} type="number" min={20} max={5000} value={form.radius} onChange={set('radius')} />
            </Field>
          </div>
          <div className="row wrap small" style={{ marginTop: 8, gap: 12 }}>
            {adaTitik ? (
              <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`} target="_blank" rel="noreferrer" className="row strong" style={{ gap: 4 }}>
                <ExternalLink size={13} /> Cek titik di Google Maps
              </a>
            ) : (
              <span className="muted">Kosongkan koordinat jika presensi gedung ini tidak dibatasi lokasi.</span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
