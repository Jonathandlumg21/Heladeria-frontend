import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import Layout from './components/Layout'
import Login      from './pages/Login'
import Ventas     from './pages/Ventas'
import Inventario from './pages/Inventario'
import Dashboard  from './pages/Dashboard'
import Productos  from './pages/Productos'
import Admin      from './pages/Admin'
import Reportes   from './pages/Reportes'
import Compras from './pages/Compras'

function AppRoutes() {
  const { usuario } = useAuth()

  const inicio = usuario?.rol === 'vendedor'    ? '/ventas'
               : usuario?.rol === 'bodeguero'  ? '/inventario'
               : usuario?.rol === 'propietario' ? '/dashboard'
               : '/dashboard'

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to={inicio} /> : <Login />} />

      <Route path="/" element={
        usuario ? <Navigate to={inicio} /> : <Navigate to="/login" />
      } />

      <Route path="/ventas" element={
        <RutaProtegida roles={['admin','vendedor']}>
          <Layout><Ventas /></Layout>
        </RutaProtegida>
      } />

      <Route path="/inventario" element={
        <RutaProtegida roles={['admin','vendedor','bodeguero']}>
          <Layout><Inventario /></Layout>
        </RutaProtegida>
      } />

      <Route path="/dashboard" element={
        <RutaProtegida roles={['admin', 'vendedor', 'propietario']}>
          <Layout><Dashboard /></Layout>
        </RutaProtegida>
      } />

      <Route path="/productos" element={
        <RutaProtegida roles={['admin']}>
          <Layout><Productos /></Layout>
        </RutaProtegida>
      } />

      <Route path="/admin" element={
        <RutaProtegida roles={['admin']}>
          <Layout><Admin /></Layout>
        </RutaProtegida>
      } />

      <Route path="/reportes" element={
        <RutaProtegida roles={['admin']}>
          <Layout><Reportes /></Layout>
        </RutaProtegida>
      } />

      <Route path="/compras" element={
        <RutaProtegida roles={['admin','vendedor']}>
          <Layout><Compras /></Layout>
        </RutaProtegida>
      } />

      <Route path="*" element={
        usuario ? <Navigate to={inicio} /> : <Navigate to="/login" />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}