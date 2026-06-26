import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import logo from '../assets/logo.png'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const usuario = await login(email, password)
      toast.success(`Bienvenido, ${usuario.nombre}`)
      if (usuario.rol === 'vendedor')        navigate('/ventas')
      else if (usuario.rol === 'bodeguero')  navigate('/inventario')
      else                                   navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="Logo" style={{
            width: 90, height: 90, borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid var(--azul)',
            boxShadow: '0 4px 20px rgba(26,86,160,0.25)',
          }}/>
        </div>
        <h1 className="login-title">Heladería POS</h1>
        <p className="login-sub">Ingresa tus credenciales para continuar</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              type="email"
              className="form-control"
              placeholder="admin@heladeria.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: 8, padding: '11px', fontSize: 15 }}
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>


      </div>
    </div>
  )
}