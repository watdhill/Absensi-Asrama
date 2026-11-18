import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, IdCard, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorBox, Field, Modal } from '../components/ui';
import fotoAsrama from '../assets/asrama-unand.jpg';
import logoUnand from '../assets/logo-unand.png';

// akun hasil `npm run seed` di backend, untuk memudahkan demo
const DEMO = [
  ['Penghuni', '2311523012'],
  ['Fasil', 'hendra.fasil@unand.ac.id'],
  ['Admin', 'admin@unand.ac.id'],
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '', ingat: false });
  const [lihat, setLihat] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lupa, setLupa] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.identifier.trim()) err.identifier = 'Email / NIM wajib diisi';
    if (!form.password) err.password = 'Password wajib diisi';
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    setError('');
    try {
      await login(form.identifier.trim(), form.password, form.ingat);
      navigate('/dashboard', { replace: true });
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-brand" style={{ '--foto': `url(${fotoAsrama})` }}>
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-logo">
            <img src={logoUnand} alt="Logo Universitas Andalas" />
          </div>
          <div>
            <div className="brand-name">ASRAMA UNAND</div>
            <div className="brand-sub">Universitas Andalas</div>
          </div>
        </div>
        <div>
          <h1>Sistem Absensi Penghuni Asrama</h1>
          <p className="lead">Universitas Andalas</p>
        </div>
        <p className="small" style={{ opacity: 0.6 }}>
          © {new Date().getFullYear()} Asrama Universitas Andalas, Padang
        </p>
      </section>

      <section className="login-form-side">
        <form className="login-form" onSubmit={submit} noValidate>
          <div>
            <h2>Selamat Datang</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Masuk untuk melakukan presensi dan mengelola perizinan.
            </p>
          </div>

          {error && <ErrorBox message={error} />}

          <Field label="Email / NIM" error={errors.identifier}>
            <div className="input-wrap">
              <IdCard size={18} className="input-icon" />
              <input
                className={`input ${errors.identifier ? 'invalid' : ''}`}
                placeholder="Masukkan email atau NIM"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                autoComplete="username"
                autoFocus
              />
            </div>
          </Field>

          <Field label="Password" error={errors.password}>
            <div className="input-wrap">
              <Lock size={18} className="input-icon" />
              <input
                className={`input has-right ${errors.password ? 'invalid' : ''}`}
                type={lihat ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setLihat((v) => !v)}
                aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <div className="row between">
            <label className="check">
              <input type="checkbox" checked={form.ingat} onChange={(e) => setForm({ ...form, ingat: e.target.checked })} />
              Ingat saya
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLupa(true)}>
              Lupa password?
            </button>
          </div>

          <Button type="submit" size="lg" block loading={busy}>
            Masuk
          </Button>

          <div className="demo-accounts">
            Akun demo (password: <b>password123</b>):
            <div>
              {DEMO.map(([role, id]) => (
                <button
                  key={role}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setForm({ ...form, identifier: id, password: 'password123' })}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>

      <Modal
        open={lupa}
        onClose={() => setLupa(false)}
        title="Lupa Password"
        footer={<Button onClick={() => setLupa(false)}>Mengerti</Button>}
      >
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <div className="stat-icon tone-primary">
            <KeyRound size={22} />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <p>
              Untuk alasan keamanan, password hanya dapat direset oleh pengelola asrama. Hubungi fasil asrama Anda atau
              admin melalui email berikut dengan menyertakan nama lengkap dan NIM:
            </p>
            <a href="mailto:admin@unand.ac.id" className="row strong">
              <Mail size={16} /> admin@unand.ac.id
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
}
