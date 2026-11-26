import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { JENIS_IZIN, rentangTgl } from '../../lib/format';
import { FileUpload } from '../../components/Bukti';
import { Button, ConfirmDialog, Field, SuccessDialog } from '../../components/ui';

const ALASAN_MIN = 10;
const ALASAN_MAX = 500;

const kosong = { jenis: '', tanggalMulai: '', tanggalSelesai: '', alasan: '', bukti: null };

function validasi(form) {
  const e = {};
  if (!form.jenis) e.jenis = 'Pilih jenis izin';
  if (!form.tanggalMulai) e.tanggalMulai = 'Tanggal mulai wajib diisi';
  if (!form.tanggalSelesai) e.tanggalSelesai = 'Tanggal selesai wajib diisi';
  else if (form.tanggalMulai && form.tanggalSelesai < form.tanggalMulai)
    e.tanggalSelesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai';
  const alasan = form.alasan.trim();
  if (!alasan) e.alasan = 'Alasan wajib diisi';
  else if (alasan.length < ALASAN_MIN) e.alasan = `Alasan minimal ${ALASAN_MIN} karakter`;
  else if (alasan.length > ALASAN_MAX) e.alasan = `Alasan maksimal ${ALASAN_MAX} karakter`;
  if (!form.bukti) e.bukti = 'File bukti wajib diunggah';
  return e;
}

export default function AjukanIzin() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(kosong);
  const [errors, setErrors] = useState({});
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [hasil, setHasil] = useState(null);

  const ubah = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const set = (k) => (e) => ubah(k, e.target.value);
  const err = (k) => (errors[k] ? 'invalid' : '');

  const submit = (e) => {
    e.preventDefault();
    const v = validasi(form);
    setErrors(v);
    if (Object.keys(v).length) return toast.error('Periksa kembali isian formulir');
    setKonfirmasi(true);
  };

  const kirim = async () => {
    const fd = new FormData();
    fd.append('jenis', form.jenis);
    fd.append('tanggalMulai', form.tanggalMulai);
    fd.append('tanggalSelesai', form.tanggalSelesai);
    fd.append('alasan', form.alasan.trim());
    fd.append('bukti', form.bukti);
    try {
      const res = await api.post('/izin', fd);
      setKonfirmasi(false);
      setHasil(res.data);
    } catch (error) {
      setKonfirmasi(false);
      toast.error(error.message);
    }
  };

  const panjang = form.alasan.trim().length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button className="back-link" onClick={() => navigate('/perizinan')}>
        <ArrowLeft size={16} /> Kembali ke Perizinan
      </button>

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-head">
          <div>
            <h2>Ajukan Izin</h2>
            <div className="card-sub">Semua kolom wajib diisi. Izin akan ditinjau oleh fasilitator asrama.</div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-grid">
            <Field label="Jenis Izin" required error={errors.jenis} className="span-2">
              <select className={`select ${err('jenis')}`} value={form.jenis} onChange={set('jenis')}>
                <option value="">Pilih jenis izin</option>
                {JENIS_IZIN.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal Mulai" required error={errors.tanggalMulai}>
              <input
                type="date"
                className={`input ${err('tanggalMulai')}`}
                value={form.tanggalMulai}
                onChange={(e) => {
                  ubah('tanggalMulai', e.target.value);
                  // isi tanggal selesai otomatis untuk izin satu hari
                  if (!form.tanggalSelesai || form.tanggalSelesai < e.target.value) ubah('tanggalSelesai', e.target.value);
                }}
              />
            </Field>
            <Field label="Tanggal Selesai" required error={errors.tanggalSelesai}>
              <input
                type="date"
                className={`input ${err('tanggalSelesai')}`}
                value={form.tanggalSelesai}
                min={form.tanggalMulai || undefined}
                onChange={set('tanggalSelesai')}
              />
            </Field>
            <Field
              label="Alasan"
              required
              error={errors.alasan}
              hint={`${panjang}/${ALASAN_MAX} karakter • minimal ${ALASAN_MIN}`}
              className="span-2"
            >
              <textarea
                className={`textarea ${err('alasan')}`}
                value={form.alasan}
                maxLength={ALASAN_MAX}
                onChange={set('alasan')}
                placeholder="Jelaskan alasan Anda tidak dapat hadir, misalnya: pulang ke rumah karena ada acara keluarga."
              />
            </Field>
            <Field label="Bukti Pendukung" required error={errors.bukti} className="span-2">
              <FileUpload
                value={form.bukti}
                onChange={(f) => ubah('bukti', f)}
                error={errors.bukti}
                onError={(m) => setErrors((e) => ({ ...e, bukti: m }))}
              />
            </Field>
          </div>
        </div>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate('/perizinan')}>
            Batal
          </Button>
          <Button type="submit">
            <Send size={16} /> Kirim Pengajuan
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        onConfirm={kirim}
        icon={Send}
        title="Kirim pengajuan izin?"
        message={
          form.tanggalMulai &&
          `${form.jenis} untuk ${rentangTgl(form.tanggalMulai, form.tanggalSelesai)}. Pengajuan tidak dapat diubah setelah dikirim.`
        }
        confirmLabel="Kirim"
      />
      <SuccessDialog
        open={Boolean(hasil)}
        title="Pengajuan Terkirim"
        message="Izin Anda sedang menunggu persetujuan fasilitator. Anda akan mendapat notifikasi setelah izin diputuskan."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/perizinan')}>
              Ke Daftar Izin
            </Button>
            <Button onClick={() => navigate(`/perizinan/${hasil.id}`)}>Lihat Detail</Button>
          </>
        }
      />
    </div>
  );
}
