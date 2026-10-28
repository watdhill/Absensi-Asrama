import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, IdCard, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorBox, Field, Modal } from '../components/ui';

// akun hasil `npm run seed` di backend, untuk memudahkan demo
const DEMO = [
  ['Penghuni', '2311523012'],
  ['Fasil', 'hendra.fasil@unand.ac.id'],
  ['Admin', 'admin@unand.ac.id'],
];

function IlustrasiAsrama() {
  return (
    <svg className="login-illustration" viewBox="0 0 460 300" fill="none" aria-hidden="true">
      <ellipse cx="230" cy="280" rx="210" ry="14" fill="rgb(255 255 255 / 0.08)" />
      {/* gedung utama */}
      <rect x="110" y="70" width="240" height="210" rx="6" fill="#fff" />
      <path d="M96 78 230 22l134 56z" fill="#F59E0B" />
      <rect x="110" y="78" width="240" height="10" fill="#E5E7EB" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={128 + c * 44}
            y={102 + r * 40}
            width="28"
            height="24"
            rx="3"
            fill={(r + c) % 3 === 0 ? '#FDE68A' : '#BFD3EA'}
          />
        ))
      )}
      <rect x="208" y="236" width="44" height="44" rx="4" fill="#123B66" />
      <rect x="216" y="244" width="12" height="36" fill="#1E5A91" />
      <rect x="232" y="244" width="12" height="36" fill="#1E5A91" />
      {/* sayap kiri & kanan */}
      <rect x="30" y="140" width="80" height="140" rx="4" fill="rgb(255 255 255 / 0.85)" />
      <rect x="350" y="140" width="80" height="140" rx="4" fill="rgb(255 255 255 / 0.85)" />
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="46" y={158 + r * 38} width="20" height="20" rx="3" fill="#BFD3EA" />
          <rect x="76" y={158 + r * 38} width="20" height="20" rx="3" fill="#BFD3EA" />
          <rect x="366" y={158 + r * 38} width="20" height="20" rx="3" fill="#BFD3EA" />
          <rect x="396" y={158 + r * 38} width="20" height="20" rx="3" fill="#FDE68A" />
        </g>
      ))}
      {/* pohon */}
      <circle cx="18" cy="236" r="22" fill="#16A34A" opacity=".85" />
      <rect x="15" y="250" width="6" height="30" fill="#7c4a1d" />
      <circle cx="446" cy="230" r="26" fill="#16A34A" opacity=".85" />
      <rect x="443" y="248" width="6" height="32" fill="#7c4a1d" />
      {/* mahasiswa */}
      <circle cx="170" cy="246" r="8" fill="#F8D3B0" />
      <rect x="162" y="256" width="16" height="24" rx="6" fill="#1E5A91" />
      <circle cx="290" cy="246" r="8" fill="#F8D3B0" />
      <rect x="282" y="256" width="16" height="24" rx="6" fill="#F59E0B" />
      {/* tanda centang presensi */}
      <circle cx="380" cy="70" r="30" fill="#16A34A" />
      <path d="m366 70 10 10 19-20" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
      <section className="login-brand">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-logo">UA</div>
          <div>
            <div className="brand-name">ASRAMA UNAND</div>
            <div className="brand-sub">Universitas Andalas</div>
          </div>
        </div>
        <div>
          <IlustrasiAsrama />
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
