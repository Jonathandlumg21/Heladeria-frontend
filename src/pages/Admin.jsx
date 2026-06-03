import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const VACÍO = { nombre: '', email: '', password: '', rol: 'vendedor', activo: true }
const ROL_LABEL = { admin: 'Administrador', vendedor: 'Vendedor', bodeguero: 'Bodeguero' }
const ROL_BADGE = { admin: 'badge-admin', vendedor: 'badge-vendedor', bodeguero: 'badge-bodeguero' }

export default function Admin() {
  const [usuarios, setUsuarios]       = useState([])
  const [modal, setModal]             = useState(null)
  const [form, setForm]               = useState(VACÍO)
  const [usuarioActivo, setUserActivo] = useState(null)
  const [modalPass, setModalPass]     = useState(null)
  const [nuevaPass, setNuevaPass]     = useState('')
  const [guardando, setGuardando]     = useState(false)

  const cargar = () => api.get('/usuarios').then(r => setUsuarios(r.data))
  useEffect(() => { cargar() }, [])

  const abrirCrear = () => {
    setForm(VACÍO); setModal('crear'); setUserActivo(null)
  }

  const abrirEditar = (u) => {
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo })
    setUserActivo(u); setModal('editar')
  }

  const guardar = async () => {
    if (!form.nombre || !form.email || !form.rol) {
      toast.error('Nombre, email y rol son requeridos'); return
    }
    if (modal === 'crear' && !form.password) {
      toast.error('La contraseña es requerida'); return
    }
    setGuardando(true)
    try {
      if (modal === 'crear') {
        await api.post('/usuarios', form)
        toast.success('Usuario creado correctamente')
      } else {
        await api.put(`/usuarios/${usuarioActivo.id}`, {
          nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo,
        })
        toast.success('Usuario actualizado')
      }
      setModal(null); cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (u) => {
    await api.patch(`/usuarios/${u.id}/toggle`)
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    cargar()
  }

  const cambiarPassword = async () => {
    if (!nuevaPass || nuevaPass.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres'); return
    }
    await api.patch(`/usuarios/${modalPass.id}/password`, { password: nuevaPass })
    toast.success('Contraseña actualizada')
    setModalPass(null); setNuevaPass('')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ Administración</h1>
        <button className="btn btn-primary" onClick={abrirCrear}>+ Nuevo usuario</button>
      </div>

      <div className="page-content">
        {/* Resumen de roles */}
        <div className="metrics-grid" style={{ marginBottom: 24 }}>
          {['admin','vendedor','bodeguero'].map(rol => (
            <div key={rol} className="metric-card">
              <div className="metric-label">{ROL_LABEL[rol]}s</div>
              <div className="metric-value">{usuarios.filter(u => u.rol === rol).length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {usuarios.filter(u => u.rol === rol && u.activo).length} activos
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.nombre}</td>
                    <td className="text-muted">{u.email}</td>
                    <td><span className={`badge ${ROL_BADGE[u.rol]}`}>{ROL_LABEL[u.rol]}</span></td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-muted">
                      {new Date(u.creado_en).toLocaleDateString('es')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(u)}>
                          Editar
                        </button>
                        <button className="btn btn-outline btn-sm"
                          onClick={() => { setModalPass(u); setNuevaPass('') }}>
                          Contraseña
                        </button>
                        <button
                          className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => toggleActivo(u)}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal crear/editar usuario */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === 'crear' ? 'Nuevo usuario' : `Editar: ${usuarioActivo?.nombre}`}
              </h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre completo</label>
                  <input className="form-control" value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input type="email" className="form-control" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-control" value={form.rol}
                    onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                    <option value="vendedor">Vendedor</option>
                    <option value="bodeguero">Bodeguero</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {modal === 'crear' ? (
                  <div className="form-group">
                    <label className="form-label">Contraseña inicial</label>
                    <input type="password" className="form-control" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"/>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-control" value={form.activo ? 'true' : 'false'}
                      onChange={e => setForm(f => ({ ...f, activo: e.target.value === 'true' }))}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, fontSize: 13 }}>
                {form.rol === 'admin'     && <p>✅ Acceso completo a todos los módulos</p>}
                {form.rol === 'vendedor'  && <p>🛒 Acceso a ventas e inventario (solo lectura de stock)</p>}
                {form.rol === 'bodeguero' && <p>📦 Acceso a inventario: ver stock e ingresar entradas</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {modalPass && (
        <div className="modal-overlay" onClick={() => setModalPass(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cambiar contraseña: {modalPass.nombre}</h3>
              <button className="modal-close" onClick={() => setModalPass(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input type="password" className="form-control" value={nuevaPass}
                  onChange={e => setNuevaPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres" autoFocus/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalPass(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={cambiarPassword}>Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}