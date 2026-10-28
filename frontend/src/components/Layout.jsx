import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  ChevronDown,
  CircleCheck,
  CircleUser,
  CircleX,
  ClipboardCheck,
  FileText,
  Fingerprint,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  TriangleAlert,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { inisial, ROLE_LABEL, waktuRelatif } from '../lib/format';
import { useClickOutside } from '../lib/hooks';
import { ConfirmDialog } from './ui';

const NAV = {
  penghuni: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/presensi', label: 'Presensi', icon: Fingerprint },
    { to: '/riwayat', label: 'Riwayat Presensi', icon: History },
    { to: '/perizinan', label: 'Perizinan', icon: FileText },
  ],
  fasil: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/data-presensi', label: 'Data Presensi', icon: ClipboardCheck },
    { to: '/perizinan', label: 'Perizinan', icon: FileText },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/penghuni', label: 'Penghuni', icon: Users },
    { to: '/fasil', label: 'Fasil', icon: UserCog },
    { to: '/data-presensi', label: 'Presensi', icon: ClipboardCheck },
  ],
};

const JUDUL = [
  ['/dashboard', 'Dashboard'],
  ['/presensi', 'Presensi'],
  ['/riwayat', 'Riwayat Presensi'],
  ['/perizinan/ajukan', 'Ajukan Izin'],
  ['/perizinan/', 'Detail Pengajuan Izin'],
  ['/perizinan', 'Perizinan'],
  ['/data-presensi', 'Data Presensi'],
  ['/penghuni/tambah', 'Tambah Penghuni'],
  ['/penghuni/', 'Edit Penghuni'],
  ['/penghuni', 'Data Penghuni'],
  ['/fasil/tambah', 'Tambah Fasil'],
  ['/fasil/', 'Edit Fasil'],
  ['/fasil', 'Data Fasil'],
  ['/profile', 'Profil'],
];

const NOTIF_ICON = {
  peringatan: [TriangleAlert, 'tone-warning'],
  sukses: [CircleCheck, 'tone-success'],
  bahaya: [CircleX, 'tone-danger'],
  info: [Info, 'tone-info'],
};

function Notifikasi() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  // dimuat ulang setiap pindah halaman, supaya jumlahnya selalu terbaru
  useEffect(() => {
    api
      .get('/notifikasi')
      .then((res) => setItems(res.data))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifikasi">
        <Bell size={20} />
        {items.length > 0 && <span className="dot">{items.length}</span>}
      </button>
      {open && (
        <div className="dropdown-panel wide">
          <div className="dropdown-head">
            Notifikasi
            <span className="tab-count">{items.length}</span>
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="empty" style={{ padding: 28 }}>
                <div className="empty-icon">
                  <BellOff size={22} />
                </div>
                Tidak ada notifikasi baru
              </div>
            ) : (
              items.map((n) => {
                const [Icon, tone] = NOTIF_ICON[n.jenis] || NOTIF_ICON.info;
                return (
                  <button
                    key={n.id}
                    className="notif-item"
                    onClick={() => {
                      setOpen(false);
                      navigate(n.link);
                    }}
                  >
                    <span className={`notif-icon ${tone}`}>
                      <Icon size={18} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="strong" style={{ display: 'block' }}>
                        {n.judul}
                      </span>
                      <span className="cell-sub" style={{ display: 'block' }}>
                        {n.pesan}
                      </span>
                      {n.waktu && <span className="small" style={{ color: 'var(--text-3)' }}>{waktuRelatif(n.waktu)}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilMenu({ onLogout }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div className="dropdown" ref={ref}>
      <button className="user-chip" onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{inisial(user.name)}</span>
        <span className="user-chip-text">
          <span className="user-chip-name" style={{ display: 'block' }}>
            {user.name}
          </span>
          <span className="user-chip-role">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown size={16} color="var(--text-2)" />
      </button>
      {open && (
        <div className="dropdown-panel">
          <button
            className="dropdown-item"
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
          >
            <CircleUser size={16} /> Profil
          </button>
          <button
            className="dropdown-item danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [konfirmLogout, setKonfirmLogout] = useState(false);

  // tutup sidebar mobile setiap pindah halaman
  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const judul = JUDUL.find(([prefix]) => location.pathname.startsWith(prefix))?.[1] || '';
  const nav = NAV[user.role];

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">UA</div>
          <div>
            <div className="brand-name">ASRAMA UNAND</div>
            <div className="brand-sub">Sistem Absensi Penghuni</div>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-label">Menu</div>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
          <div className="nav-label" style={{ marginTop: 12 }}>
            Akun
          </div>
          <NavLink to="/profile">
            <CircleUser size={20} />
            Profile
          </NavLink>
          <div style={{ flex: 1 }} />
          <button className="nav-btn" onClick={() => setKonfirmLogout(true)}>
            <LogOut size={20} />
            Logout
          </button>
        </nav>
      </aside>
      <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
            <Menu size={20} />
          </button>
          <div className="topbar-title">{judul}</div>
          <Notifikasi />
          <ProfilMenu onLogout={() => setKonfirmLogout(true)} />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={konfirmLogout}
        onClose={() => setKonfirmLogout(false)}
        onConfirm={() => {
          logout();
          navigate('/login', { replace: true });
        }}
        icon={LogOut}
        tone="danger"
        title="Keluar dari aplikasi?"
        message="Apakah Anda yakin ingin keluar?"
        confirmLabel="Keluar"
      />
    </div>
  );
}
