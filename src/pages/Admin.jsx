import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const VACÍO = { nombre: '', email: '', password: '', rol: 'vendedor', activo: true }
const ROL_LABEL = { admin: 'Administrador', vendedor: 'Vendedor', bodeguero: 'Bodeguero', propietario: 'Propietario' }
const ROL_BADGE = { admin: 'badge-admin', vendedor: 'badge-vendedor', bodeguero: 'badge-bodeguero', propietario: 'badge-propietario' }

const GASTO_VACÍO = { categoria: 'pedido', descripcion: '', monto: '', fecha: '' }
const CATEGORIA_LABEL = { pedido: 'Pedido', pago_negocio: 'Pago del negocio' }
const fmtQ = (n) => `Q${parseFloat(n || 0).toFixed(2)}`

export default function Admin() {
  const [usuarios, setUsuarios]         = useState([])
  const [modal, setModal]               = useState(null)
  const [form, setForm]                 = useState(VACÍO)
  const [usuarioActivo, setUserActivo]  = useState(null)
  const [modalPass, setModalPass]       = useState(null)
  const [nuevaPass, setNuevaPass]       = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [categorias, setCategorias]     = useState([])
  const [nuevaCat, setNuevaCat]         = useState('')
  const [guardandoCat, setGuardandoCat] = useState(false)

  const [gastos, setGastos]             = useState([])
  const [filtroGasto, setFiltroGasto]   = useState('')
  const [formGasto, setFormGasto]       = useState(GASTO_VACÍO)
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [resumenMes, setResumenMes]     = useState(null)

  const cargar = () => api.get('/usuarios').then(r => setUsuarios(r.data))
  const cargarCats = () => api.get('/usuarios/categorias').then(r => setCategorias(r.data))
  const cargarGastos = (categoria = filtroGasto) =>
    api.get('/gastos', { params: categoria ? { categoria } : {} }).then(r => setGastos(r.data))
  const cargarResumenMes = () => api.get('/gastos/resumen-mes').then(r => setResumenMes(r.data))
  useEffect(() => { cargar(); cargarCats(); cargarGastos(''); cargarResumenMes() }, [])

  const agregarGasto = async () => {
    if (!formGasto.descripcion.trim() || !formGasto.monto || parseFloat(formGasto.monto) <= 0) {
      toast.error('Descripción y monto válido son requeridos'); return
    }
    setGuardandoGasto(true)
    try {
      await api.post('/gastos', {
        categoria:   formGasto.categoria,
        descripcion: formGasto.descripcion.trim(),
        monto:       parseFloat(formGasto.monto),
        fecha:       formGasto.fecha || undefined,
      })
      toast.success('Registro agregado')
      setFormGasto(f => ({ ...GASTO_VACÍO, categoria: f.categoria }))
      cargarGastos()
      cargarResumenMes()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardandoGasto(false)
    }
  }

  const eliminarGasto = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.delete(`/gastos/${id}`)
      toast.success('Registro eliminado')
      cargarGastos()
      cargarResumenMes()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const totalListaPedidos = gastos.filter(g => g.categoria === 'pedido').reduce((s, g) => s + parseFloat(g.monto), 0)
  const totalListaPagos   = gastos.filter(g => g.categoria === 'pago_negocio').reduce((s, g) => s + parseFloat(g.monto), 0)

  const agregarCategoria = async () => {
    if (!nuevaCat.trim()) return
    setGuardandoCat(true)
    try {
      await api.post('/usuarios/categorias', { nombre: nuevaCat.trim() })
      toast.success('Categoría agregada')
      setNuevaCat('')
      cargarCats()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al agregar')
    } finally {
      setGuardandoCat(false)
    }
  }

  const eliminarCategoria = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return
    try {
      await api.delete(`/usuarios/categorias/${cat.id}`)
      toast.success('Categoría eliminada')
      cargarCats()
    } catch {
      toast.error('Error al eliminar')
    }
  }

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
          {['admin','vendedor','bodeguero','propietario'].map(rol => (
            <div key={rol} className="metric-card">
              <div className="metric-label">{ROL_LABEL[rol]}s</div>
              <div className="metric-value">{usuarios.filter(u => u.rol === rol).length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {usuarios.filter(u => u.rol === rol && u.activo).length} activos
              </div>
            </div>
          ))}
        </div>

        {/* Gestión de categorías */}
        <div className="card card-body" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🏷️ Categorías de productos</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              className="form-control"
              style={{ maxWidth: 260 }}
              placeholder="Nueva categoría..."
              value={nuevaCat}
              onChange={e => setNuevaCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarCategoria()}
            />
            <button className="btn btn-primary" onClick={agregarCategoria} disabled={guardandoCat || !nuevaCat.trim()}>
              {guardandoCat ? 'Agregando...' : '+ Agregar'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categorias.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay categorías registradas</p>
            ) : categorias.map(cat => (
              <div key={cat.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--azul-claro)', color: 'var(--azul)',
                borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600,
              }}>
                {cat.nombre}
                <button
                  onClick={() => eliminarCategoria(cat)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--azul)', fontSize: 15, lineHeight: 1, padding: 0,
                    opacity: 0.6,
                  }}
                  title="Eliminar categoría"
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Pedidos y pagos del negocio */}
        <div className="card card-body" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>💸 Pedidos y pagos del negocio</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="metric-card">
              <div className="metric-label">Pedidos este mes</div>
              <div className="metric-value rojo">{fmtQ(resumenMes?.total_pedidos)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Pagos del negocio este mes</div>
              <div className="metric-value rojo">{fmtQ(resumenMes?.total_pagos)}</div>
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-control"
                value={formGasto.categoria}
                onChange={e => setFormGasto(f => ({ ...f, categoria: e.target.value }))}
              >
                <option value="pedido">Pedido</option>
                <option value="pago_negocio">Pago del negocio</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input
                className="form-control"
                placeholder="Ej: Pago a proveedor de insumos"
                value={formGasto.descripcion}
                onChange={e => setFormGasto(f => ({ ...f, descripcion: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && agregarGasto()}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monto (Q)</label>
              <input
                type="number"
                className="form-control"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={formGasto.monto}
                onChange={e => setFormGasto(f => ({ ...f, monto: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && agregarGasto()}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha (opcional)</label>
              <input
                type="date"
                className="form-control"
                value={formGasto.fecha}
                onChange={e => setFormGasto(f => ({ ...f, fecha: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn btn-primary" onClick={agregarGasto} disabled={guardandoGasto} style={{ marginBottom: 20 }}>
            {guardandoGasto ? 'Guardando...' : '+ Agregar registro'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ key: '', label: 'Todos' }, { key: 'pedido', label: 'Pedidos' }, { key: 'pago_negocio', label: 'Pagos del negocio' }].map(f => (
                <button
                  key={f.key}
                  className={`btn btn-sm ${filtroGasto === f.key ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setFiltroGasto(f.key); cargarGastos(f.key) }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Total mostrado — Pedidos: <strong style={{ color: 'var(--rojo)' }}>{fmtQ(totalListaPedidos)}</strong>
              {' · '}Pagos: <strong style={{ color: 'var(--rojo)' }}>{fmtQ(totalListaPagos)}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    No hay registros
                  </td></tr>
                ) : gastos.map(g => (
                  <tr key={g.id}>
                    <td>
                      <span className={`badge ${g.categoria === 'pedido' ? 'badge-vendedor' : 'badge-bodeguero'}`}>
                        {CATEGORIA_LABEL[g.categoria]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{g.descripcion}</td>
                    <td style={{ color: 'var(--rojo)', fontWeight: 700 }}>{fmtQ(g.monto)}</td>
                    <td className="text-muted">{g.usuario}</td>
                    <td className="text-muted">
                      {new Date(`${String(g.fecha).slice(0, 10)}T12:00:00`).toLocaleDateString('es')}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => eliminarGasto(g.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      {new Date(u.creado_en).toLocaleDateString('es', { timeZone: 'America/Guatemala' })}
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
                    <option value="propietario">Propietario</option>
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
                {form.rol === 'admin'       && <p>✅ Acceso completo a todos los módulos</p>}
                {form.rol === 'vendedor'    && <p>🛒 Acceso a ventas e inventario (solo lectura de stock)</p>}
                {form.rol === 'bodeguero'   && <p>📦 Acceso a inventario: ver stock e ingresar entradas</p>}
                {form.rol === 'propietario' && <p>📊 Acceso de solo lectura al Dashboard completo</p>}
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