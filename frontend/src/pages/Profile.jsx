import { useState } from 'react';
import { KeyRound, Pencil } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { inisial, ROLE_LABEL, tglPanjang } from '../lib/format';
import { Button, Field, Modal, PageHead } from '../components/ui';

function EditProfil({ open, onClose }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, telepon: user.telepon || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const simpan = async () => {
    if (!form.name.trim() || !form.email.trim()) return setError('Nama dan email wajib diisi');
    setBusy(true);
    try {
      const res = await api.put('/auth/profile', form);
      setUser(res.data);
      toast.success('Profil berhasil diperbarui');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Edit Profil"
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
      <div className="stack" style={{ gap: 14 }}>
        {error && <div className="alert tone-danger">{error}</div>}
        <Field label="Nama Lengkap" required>
          <input className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" required>
          <input className="input" type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Nomor Telepon">
          <input className="input" value={form.telepon} onChange={set('telepon')} inputMode="tel" />
        </Field>
        <p className="field-hint">NIM/NIP, asrama, dan kamar hanya dapat diubah oleh admin.</p>
      </div>
    </Modal>
  );
}

function UbahPassword({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const simpan = async () => {
    const e = {};
    if (!form.passwordLama) e.passwordLama = 'Password lama wajib diisi';
    if (form.passwordBaru.length < 6) e.passwordBaru = 'Password baru minimal 6 karakter';
    if (form.konfirmasi !== form.passwordBaru) e.konfirmasi = 'Konfirmasi password tidak sama';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.put('/auth/password', form);
      toast.success('Password berhasil diubah');
      setForm({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
      onClose();
    } catch (err) {
      setErrors({ passwordLama: err.message });
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: undefined });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Ubah Password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={simpan} loading={busy}>
            Ubah Password
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Password Lama" required error={errors.passwordLama}>
          <input className={`input ${errors.passwordLama ? 'invalid' : ''}`} type="password" value={form.passwordLama} onChange={set('passwordLama')} autoComplete="current-password" />
        </Field>
        <Field label="Password Baru" required error={errors.passwordBaru}>
          <input className={`input ${errors.passwordBaru ? 'invalid' : ''}`} type="password" value={form.passwordBaru} onChange={set('passwordBaru')} autoComplete="new-password" />
        </Field>
        <Field label="Konfirmasi Password Baru" required error={errors.konfirmasi}>
          <input className={`input ${errors.konfirmasi ? 'invalid' : ''}`} type="password" value={form.konfirmasi} onChange={set('konfirmasi')} autoComplete="new-password" />
        </Field>
      </div>
    </Modal>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [edit, setEdit] = useState(false);
  const [password, setPassword] = useState(false);

  const penugasan =
    user.role === 'penghuni'
      ? `${user.Asrama?.nama || '-'} • Kamar ${user.kamar || '-'}`
      : user.role === 'fasil'
        ? `Fasil ${user.Asrama?.nama || '-'}`
        : 'Seluruh asrama';

  return (
    <>
      <PageHead title="Profil" subtitle="Informasi akun Anda" />
      <div className="grid grid-main" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-pad row wrap" style={{ gap: 20, borderBottom: '1px solid var(--border)' }}>
            <span className="avatar lg">{inisial(user.name)}</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>{user.name}</h2>
              <div className="muted">{ROLE_LABEL[user.role]}</div>
              <div className="row wrap" style={{ marginTop: 14 }}>
                <Button variant="secondary" onClick={() => setEdit(true)}>
                  <Pencil size={16} /> Edit Profil
                </Button>
                <Button variant="secondary" onClick={() => setPassword(true)}>
                  <KeyRound size={16} /> Ubah Password
                </Button>
              </div>
            </div>
          </div>
          <div className="card-pad">
            <dl className="info-list">
              <dt>{user.role === 'penghuni' ? 'NIM' : user.role === 'fasil' ? 'NIP / ID Fasil' : 'ID Admin'}</dt>
              <dd>{user.nomorInduk || '-'}</dd>
              <dt>Email</dt>
              <dd>{user.email}</dd>
              <dt>Telepon</dt>
              <dd>{user.telepon || '-'}</dd>
              {user.role === 'penghuni' && (
                <>
                  <dt>Program Studi</dt>
                  <dd>{user.prodi || '-'}</dd>
                  <dt>Fakultas</dt>
                  <dd>{user.fakultas || '-'}</dd>
                </>
              )}
              <dt>{user.role === 'penghuni' ? 'Kamar' : 'Penugasan'}</dt>
              <dd>{penugasan}</dd>
              {user.role === 'penghuni' && (
                <>
                  <dt>Terdaftar Sejak</dt>
                  <dd>{tglPanjang(user.tanggalMasuk)}</dd>
                </>
              )}
            </dl>
          </div>
        </section>
      </div>

      {edit && <EditProfil open onClose={() => setEdit(false)} />}
      <UbahPassword open={password} onClose={() => setPassword(false)} />
    </>
  );
}
