import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import Login from './pages/Login'
import Profile from './pages/Profile'
import DetailIzin from './pages/DetailIzin'
import DashboardPenghuni from './pages/penghuni/Dashboard'
import Presensi from './pages/penghuni/Presensi'
import Riwayat from './pages/penghuni/Riwayat'
import PerizinanPenghuni from './pages/penghuni/Perizinan'
import AjukanIzin from './pages/penghuni/AjukanIzin'
import DashboardFasil from './pages/fasil/Dashboard'
import DataPresensi from './pages/fasil/DataPresensi'
import PerizinanFasil from './pages/fasil/Perizinan'
import DashboardAdmin from './pages/admin/Dashboard'
import DataAkun from './pages/admin/DataAkun'
import FormAkun from './pages/admin/FormAkun'

// Halaman yang hanya boleh dibuka role tertentu
function Only({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user.role) ? children : <Navigate to="/dashboard" replace />
}

// Komponen berbeda per role untuk path yang sama
function PerRole({ penghuni, fasil, admin }) {
  const { user } = useAuth()
  return { penghuni, fasil, admin }[user.role] || <Navigate to="/dashboard" replace />
}

function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <Loading text="Memuat sesi..." />
  return user ? <Layout /> : <Navigate to="/login" replace />
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!loading && user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route element={<Protected />}>
        <Route
          path="/dashboard"
          element={<PerRole penghuni={<DashboardPenghuni />} fasil={<DashboardFasil />} admin={<DashboardAdmin />} />}
        />

        <Route path="/presensi" element={<Only roles={['penghuni']}><Presensi /></Only>} />
        <Route path="/riwayat" element={<Only roles={['penghuni']}><Riwayat /></Only>} />
        <Route path="/perizinan" element={<PerRole penghuni={<PerizinanPenghuni />} fasil={<PerizinanFasil />} admin={<PerizinanFasil />} />} />
        <Route path="/perizinan/ajukan" element={<Only roles={['penghuni']}><AjukanIzin /></Only>} />
        <Route path="/perizinan/:id" element={<DetailIzin />} />

        <Route path="/data-presensi" element={<Only roles={['fasil', 'admin']}><DataPresensi /></Only>} />

        <Route path="/penghuni" element={<Only roles={['admin']}><DataAkun key="penghuni" role="penghuni" /></Only>} />
        <Route path="/penghuni/tambah" element={<Only roles={['admin']}><FormAkun key="penghuni" role="penghuni" /></Only>} />
        <Route path="/penghuni/:id/edit" element={<Only roles={['admin']}><FormAkun key="penghuni" role="penghuni" /></Only>} />
        <Route path="/fasil" element={<Only roles={['admin']}><DataAkun key="fasil" role="fasil" /></Only>} />
        <Route path="/fasil/tambah" element={<Only roles={['admin']}><FormAkun key="fasil" role="fasil" /></Only>} />
        <Route path="/fasil/:id/edit" element={<Only roles={['admin']}><FormAkun key="fasil" role="fasil" /></Only>} />

        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
