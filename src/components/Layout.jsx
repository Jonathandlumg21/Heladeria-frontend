import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/ventas',     icon: '🛒', label: 'Ventas',         roles: ['admin','vendedor'] },
  { to: '/inventario', icon: '📦', label: 'Inventario',     roles: ['admin','vendedor','bodeguero'] },
  { to: '/dashboard',  icon: '📊', label: 'Dashboard',      roles: ['admin'] },
  { to: '/productos',  icon: '🍦', label: 'Productos',      roles: ['admin'] },
  { to: '/admin',      icon: '⚙️', label: 'Administración', roles: ['admin'] },
]

export default function Layout({ children }) {
  const { usuario, logout, tieneRol } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const ROLE_LABEL = {
    admin:     'Administrador',
    vendedor:  'Vendedor',
    bodeguero: 'Bodeguero',
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🍦</span> Heladería
        </div>

        <nav className="sidebar-nav">
          {NAV.filter(n => tieneRol(...n.roles)).map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">{usuario?.nombre}</div>
          <div className="sidebar-role">{ROLE_LABEL[usuario?.rol]}</div>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  )
}