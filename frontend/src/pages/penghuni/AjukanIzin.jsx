import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCheck } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { JENIS_IZIN, rentangTgl } from '../../lib/format';
import { Button, ConfirmDialog, ErrorBox, Field, SuccessDialog } from '../../components/ui';
import { FileUpload } from '../../components/Bukti';

const KOSONG = { jenis: '', tanggalMulai: '', tanggalSelesai: '', alasan: '' };

function validasi(form, bukti) {
  const e = {};
  if (!form.jenis) e.jenis = 'Pilih jenis izin';
  if (!form.tanggalMulai) e.tanggalMulai = 'Tanggal mulai wajib diisi';
  if (!form.tanggalSelesai) e.tanggalSelesai = 'Tanggal selesai wajib diisi';
  else if (form.tanggalMulai && form.tanggalSelesai < form.tanggalMulai)
    e.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
  if (!form.alasan.trim()) e.alasan = 'Alasan wajib diisi';
  else if (form.alasan.trim().length < 10) e.alasan = 'Jelaskan alasan minimal 10 karakter';
  if (!bukti) e.bukti = 'Bukti izin wajib diunggah';
  return e;
}

export default function AjukanIzin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(KOSONG);
  const [bukti, setBukti] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [hasil, setHasil] = useState(null);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const submit = (e) => {
    e.preventDefault();
    const err = validasi(form, bukti);
    setErrors(err);
    if (Object.keys(err).length === 0) setKonfirmasi(true);
  };

  const kirim = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v.trim ? v.trim() : v));
    data.append('bukti', bukti);
    try {
      const res = await api.post('/izin', data);
      setKonfirmasi(false);
      setHasil(res.data);
    } catch (err) {
      setKonfirmasi(false);
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button className="back-link" onClick={() => navigate('/perizinan')}>
        <ArrowLeft size={16} /> Kembali ke Perizinan
      </button>

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-head">
          <div>
            <h2>Ajukan Izin</h2>
            <div className="card-sub">Lengkapi data berikut. Pengajuan akan ditinjau oleh fasil asrama.</div>
          </div>
        </div>

        <div className="form-section">
          {error && (
            <div style={{ marginBottom: 16 }}>
              <ErrorBox message={error} />
            </div>
          )}
          <div className="form-grid">
            <Field label="Jenis Izin" required error={errors.jenis} className="span-2">
              <select className={`select ${errors.jenis ? 'invalid' : ''}`} value={form.jenis} onChange={set('jenis')}>
                <option value="">Pilih jenis izin</option>
                {JENIS_IZIN.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal Mulai" required error={errors.tanggalMulai}>
              <input
                type="date"
                className={`input ${errors.tanggalMulai ? 'invalid' : ''}`}
                value={form.tanggalMulai}
                onChange={set('tanggalMulai')}
              />
            </Field>
            <Field label="Tanggal Selesai" required error={errors.tanggalSelesai}>
              <input
                type="date"
                className={`input ${errors.tanggalSelesai ? 'invalid' : ''}`}
                value={form.tanggalSelesai}
                min={form.tanggalMulai || undefined}
                onChange={set('tanggalSelesai')}
              />
            </Field>
            <Field label="Alasan" required error={errors.alasan} className="span-2">
              <textarea
                className={`textarea ${errors.alasan ? 'invalid' : ''}`}
                placeholder="Jelaskan alasan pengajuan izin secara singkat dan jelas"
                value={form.alasan}
                onChange={set('alasan')}
                maxLength={500}
              />
            </Field>
            <Field label="Bukti Izin" required error={errors.bukti} className="span-2">
              <FileUpload
                value={bukti}
                error={errors.bukti}
                onChange={(f) => {
                  setBukti(f);
                  setErrors({ ...errors, bukti: undefined });
                }}
                onError={(msg) => setErrors({ ...errors, bukti: msg })}
              />
            </Field>
          </div>
        </div>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate('/perizinan')}>
            Batal
          </Button>
          <Button type="submit">Ajukan Izin</Button>
        </div>
      </form>

      <ConfirmDialog
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        onConfirm={kirim}
        icon={FileCheck}
        title="Kirim Pengajuan Izin?"
        message={`Apakah data pengajuan sudah benar? ${form.jenis}, ${
          form.tanggalMulai ? rentangTgl(form.tanggalMulai, form.tanggalSelesai) : ''
        }.`}
        confirmLabel="Ajukan"
      />

      <SuccessDialog
        open={Boolean(hasil)}
        title="Pengajuan Terkirim"
        message="Pengajuan izin berhasil dikirim dan menunggu persetujuan fasil."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/perizinan')}>
              Kembali
            </Button>
            <Button onClick={() => navigate(`/perizinan/${hasil.id}`)}>Lihat Pengajuan</Button>
          </>
        }
      />
    </div>
  );
}
