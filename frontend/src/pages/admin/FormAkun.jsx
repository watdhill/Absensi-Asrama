import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../lib/hooks';
import { PRODI } from '../../lib/format';
import { Button, ConfirmDialog, ErrorBox, Field, Loading, SuccessDialog } from '../../components/ui';
import { AKUN } from './config';

const KOSONG = {
  nomorInduk: '',
  name: '',
  jenisKelamin: '',
  prodi: '',
  fakultas: '',
  asramaId: '',
  kamar: '',
  telepon: '',
  email: '',
  password: '',
};

function validasi(form, role, edit) {
  const e = {};
  const wajib = (k, msg) => !String(form[k] || '').trim() && (e[k] = msg);
  wajib('nomorInduk', role === 'penghuni' ? 'NIM wajib diisi' : 'NIP / ID Fasil wajib diisi');
  wajib('name', 'Nama lengkap wajib diisi');
  wajib('email', 'Email wajib diisi');
  wajib('asramaId', 'Pilih asrama');
  if (role === 'penghuni') {
    if (form.nomorInduk && !/^\d{8,12}$/.test(form.nomorInduk)) e.nomorInduk = 'NIM berupa 8–12 digit angka';
    wajib('jenisKelamin', 'Pilih jenis kelamin');
    wajib('prodi', 'Pilih program studi');
    wajib('kamar', 'Nomor kamar wajib diisi');
  }
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Format email tidak valid';
  if (!edit && !form.password) e.password = 'Password wajib diisi';
  if (form.password && form.password.length < 6) e.password = 'Password minimal 6 karakter';
  return e;
}

function Section({ no, title, children }) {
  return (
    <div className="form-section">
      <div className="form-section-title">
        <span className="form-section-num">{no}</span>
        {title}
      </div>
      <div className="form-grid">{children}</div>
    </div>
  );
}

export default function FormAkun({ role }) {
  const cfg = AKUN[role];
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const asrama = useFetch(() => api.get('/asrama'), []);
  const awal = useFetch(() => (edit ? api.get(`${cfg.path}/${id}`) : Promise.resolve(null)), [id]);

  const [form, setForm] = useState(KOSONG);
  const [errors, setErrors] = useState({});
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [sukses, setSukses] = useState('');

  // isi form dengan data lama saat mode edit
  useEffect(() => {
    const u = awal.data?.data;
    if (!u) return;
    setForm(Object.fromEntries(Object.keys(KOSONG).map((k) => [k, u[k] ?? ''])));
  }, [awal.data]);

  const set = (k) => (e) => {
    const value = e.target.value;
    const next = { ...form, [k]: value };
    if (k === 'prodi') next.fakultas = PRODI[value] || '';
    if (k === 'asramaId' && role === 'penghuni') {
      const a = asrama.data?.data.find((x) => String(x.id) === value);
      if (a && !form.kamar) next.kamar = `${a.kode}-`;
    }
    setForm(next);
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const err = (k) => (errors[k] ? 'invalid' : '');

  const submit = (e) => {
    e.preventDefault();
    const v = validasi(form, role, edit);
    setErrors(v);
    if (Object.keys(v).length === 0) setKonfirmasi(true);
  };

  const simpan = async () => {
    const body = { ...form, nomorInduk: form.nomorInduk.trim(), name: form.name.trim(), email: form.email.trim() };
    if (edit && !body.password) delete body.password;
    try {
      const res = edit ? await api.put(`${cfg.path}/${id}`, body) : await api.post(cfg.path, body);
      setKonfirmasi(false);
      setSukses(res.message);
    } catch (e2) {
      setKonfirmasi(false);
      toast.error(e2.message);
      // tandai field yang bermasalah kalau pesannya jelas
      if (/email/i.test(e2.message)) setErrors({ email: e2.message });
      if (/NIM|NIP/i.test(e2.message)) setErrors({ nomorInduk: e2.message });
    }
  };

  if (edit && awal.error) return <ErrorBox message={awal.error} />;
  if (edit && !awal.data) return <Loading />;

  const daftarAsrama = asrama.data?.data || [];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <button className="back-link" onClick={() => navigate(cfg.path)}>
        <ArrowLeft size={16} /> Kembali ke Data {cfg.label}
      </button>

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-head">
          <div>
            <h2>
              {edit ? 'Edit' : 'Tambah'} {cfg.label}
            </h2>
            <div className="card-sub">Kolom bertanda * wajib diisi</div>
          </div>
        </div>

        {role === 'penghuni' ? (
          <>
            <Section no={1} title="Data Pribadi">
              <Field label="NIM" required error={errors.nomorInduk}>
                <input className={`input ${err('nomorInduk')}`} value={form.nomorInduk} onChange={set('nomorInduk')} placeholder="Contoh: 2311523012" inputMode="numeric" />
              </Field>
              <Field label="Nama Lengkap" required error={errors.name}>
                <input className={`input ${err('name')}`} value={form.name} onChange={set('name')} placeholder="Nama sesuai KTM" />
              </Field>
              <Field label="Jenis Kelamin" required error={errors.jenisKelamin}>
                <select className={`select ${err('jenisKelamin')}`} value={form.jenisKelamin} onChange={set('jenisKelamin')}>
                  <option value="">Pilih jenis kelamin</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </Field>
              <Field label="Program Studi" required error={errors.prodi}>
                <select className={`select ${err('prodi')}`} value={form.prodi} onChange={set('prodi')}>
                  <option value="">Pilih program studi</option>
                  {Object.keys(PRODI).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fakultas" hint="Terisi otomatis dari program studi">
                <input className="input" value={form.fakultas} disabled />
              </Field>
              <Field label="Nomor Telepon">
                <input className="input" value={form.telepon} onChange={set('telepon')} placeholder="08xxxxxxxxxx" inputMode="tel" />
              </Field>
            </Section>
            <Section no={2} title="Data Asrama">
              <Field label="Gedung" required error={errors.asramaId}>
                <select className={`select ${err('asramaId')}`} value={form.asramaId} onChange={set('asramaId')}>
                  <option value="">Pilih gedung asrama</option>
                  {daftarAsrama.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kamar" required error={errors.kamar}>
                <input className={`input ${err('kamar')}`} value={form.kamar} onChange={set('kamar')} placeholder="Contoh: A-203" />
              </Field>
            </Section>
          </>
        ) : (
          <Section no={1} title="Data Fasil">
            <Field label="Nama Lengkap" required error={errors.name}>
              <input className={`input ${err('name')}`} value={form.name} onChange={set('name')} />
            </Field>
            <Field label="NIP / ID Fasil" required error={errors.nomorInduk}>
              <input className={`input ${err('nomorInduk')}`} value={form.nomorInduk} onChange={set('nomorInduk')} />
            </Field>
            <Field label="Nomor Telepon">
              <input className="input" value={form.telepon} onChange={set('telepon')} placeholder="08xxxxxxxxxx" inputMode="tel" />
            </Field>
            <Field label="Asrama" required error={errors.asramaId}>
              <select className={`select ${err('asramaId')}`} value={form.asramaId} onChange={set('asramaId')}>
                <option value="">Pilih asrama yang ditugaskan</option>
                {daftarAsrama.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
        )}

        <Section no={role === 'penghuni' ? 3 : 2} title="Akun">
          <Field label="Email" required error={errors.email}>
            <input className={`input ${err('email')}`} type="email" value={form.email} onChange={set('email')} placeholder="nama@unand.ac.id" />
          </Field>
          <Field
            label="Password"
            required={!edit}
            error={errors.password}
            hint={edit ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'}
          >
            <input className={`input ${err('password')}`} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
        </Section>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(cfg.path)}>
            Batal
          </Button>
          <Button type="submit">
            <Save size={16} /> {edit ? 'Simpan Perubahan' : `Simpan ${cfg.label}`}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={konfirmasi}
        onClose={() => setKonfirmasi(false)}
        onConfirm={simpan}
        icon={Save}
        title={edit ? 'Simpan perubahan?' : `Simpan data ${cfg.label.toLowerCase()}?`}
        message={`Pastikan data ${form.name || cfg.label.toLowerCase()} sudah benar sebelum disimpan.`}
        confirmLabel="Simpan"
      />
      <SuccessDialog open={Boolean(sukses)} title="Berhasil" message={sukses} actions={<Button onClick={() => navigate(cfg.path)}>OK</Button>} />
    </div>
  );
}
