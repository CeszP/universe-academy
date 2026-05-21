import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Estudiantes from './pages/Estudiantes'
import Planes from './pages/Planes'
import Pagos from './pages/Pagos'
import Accesos from './pages/Accesos'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-surface-900 flex items-center justify-center"><p className="font-mono text-surface-200/40 text-xs">Cargando...</p></div>
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/estudiantes" element={<Estudiantes />} />
          <Route path="/planes"      element={<Planes />} />
          <Route path="/pagos"       element={<Pagos />} />
          <Route path="/accesos"     element={<Accesos />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
