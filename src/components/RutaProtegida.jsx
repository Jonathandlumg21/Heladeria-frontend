import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ roles, children }) {
  const { usuario } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  if (roles && !roles.includes(usuario.rol)) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Sin acceso</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          No tienes permiso para ver esta sección.
        </p>
      </div>
    )
  }

  return children
}