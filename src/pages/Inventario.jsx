import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtro, setFiltro]       = useState('')
  const [estado, setEstado]       = useState('')
  const [modal, setModal]         = useState(null)
  const [cantidad, setCantidad]   = useState('')
  const [nota, setNota]           = useState('')
  const { tieneRol }              = useAuth()

  const cargar = () => {
    setLoading(true)
    api.get('/inventario').then(r => setProductos(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const filtrados = productos.filter(p => {
    const okNombre = p.nombre.toLowerCase().includes(filtro.toLowerCase())
    // Los compuestos no tienen estado propio — se excluyen al filtrar por estado
    if (estado && p.tipo === 'compuesto') return false
    const okEstado = !estado || p.estado_stock === estado
    return okNombre && okEstado
  })

  const simples = productos.filter(p => p.tipo !== 'compuesto')
  const stats = {
    total:    productos.length,
    ok:       simples.filter(p => p.estado_stock === 'ok').length,
    bajo:     simples.filter(p => p.estado_stock === 'bajo').length,
    sinstock: simples.filter(p => p.estado_stock === 'sin_stock').length,
  }

  const abrirEntrada = (p) => {
    setModal({ tipo: 'entrada', producto: p })
    setCantidad(''); setNota('')
  }

  const abrirAjuste = (p) => {
    setModal({ tipo: 'ajuste', producto: p })
    setCantidad(p.stock); setNota('')
  }

  const confirmarMovimiento = async () => {
    if (!cantidad || parseFloat(cantidad) < 0) {
      toast.error('Ingresa una cantidad válida'); return
    }
    try {
      if (modal.tipo === 'entrada') {
        await api.post('/inventario/entrada', {
          producto_id: modal.producto.id,
          cantidad:    parseFloat(cantidad),
          nota,
        })
        toast.success(`+${cantidad} ${modal.producto.unidad} agregados`)
      } else {
        await api.post('/inventario/ajuste', {
          producto_id: modal.producto.id,
          stock_nuevo: parseFloat(cantidad),
          nota,
        })
        toast.success('Stock ajustado correctamente')
      }
      setModal(null)
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error')
    }
  }

  const badgeEstado = (p) => {
    if (p.tipo === 'compuesto')        return <span className="badge badge-admin">Derivado</span>
    if (p.estado_stock === 'sin_stock') return <span className="badge badge-sinstock">Sin stock</span>
    if (p.estado_stock === 'bajo')      return <span className="badge badge-bajo">Stock bajo</span>
    return <span className="badge badge-ok">OK</span>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📦 Inventario</h1>
        <button className="btn btn-outline btn-sm" onClick={cargar}>🔄 Actualizar</button>
      </div>

      <div className="page-content">
        {/* Métricas */}
        <div className="metrics-grid" style={{ marginBottom: 20 }}>
          <div className="metric-card">
            <div className="metric-label">Total productos</div>
            <div className="metric-value">{stats.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">En stock</div>
            <div className="metric-value verde">{stats.ok}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Stock bajo</div>
            <div className="metric-value amarillo">{stats.bajo}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Sin stock</div>
            <div className="metric-value rojo">{stats.sinstock}</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            className="form-control"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Buscar producto..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: 180 }}
            value={estado}
            onChange={e => setEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="ok">En stock</option>
            <option value="bajo">Stock bajo</option>
            <option value="sin_stock">Sin stock</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div className="loading-center"><div className="spinner"/> Cargando...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Stock actual</th>
                    <th>Mínimo</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                    {tieneRol('admin', 'bodeguero') && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No hay productos registrados aún
                    </td></tr>
                  ) : filtrados.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.imagen_url
                            ? <img src={p.imagen_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}/>
                            : <div style={{ width: 36, height: 36, background: 'var(--bg)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍦</div>
                          }
                          <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${p.tipo === 'compuesto' ? 'badge-admin' : 'badge-vendedor'}`}>
                          {p.tipo}
                        </span>
                      </td>
                      <td className="text-muted">{p.categoria || '—'}</td>
                      <td style={{ fontWeight: 700, fontSize: 15 }}>{p.stock}</td>
                      <td className="text-muted">{p.stock_minimo}</td>
                      <td className="text-muted">{p.unidad}</td>
                      <td>{badgeEstado(p)}</td>
                      {tieneRol('admin', 'bodeguero') && (
                        <td>
                          {p.tipo !== 'compuesto' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-success btn-sm" onClick={() => abrirEntrada(p)}>
                                + Entrada
                              </button>
                              {tieneRol('admin') && (
                                <button className="btn btn-outline btn-sm" onClick={() => abrirAjuste(p)}>
                                  Ajustar
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal entrada/ajuste */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal.tipo === 'entrada' ? '+ Ingresar stock' : '⚙ Ajustar stock'}: {modal.producto.nombre}
              </h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  {modal.tipo === 'entrada' ? 'Cantidad a agregar' : 'Nuevo stock total'}
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={cantidad}
                  min={0}
                  step={modal.producto.unidad === 'kg' || modal.producto.unidad === 'litros' ? 0.1 : 1}
                  onChange={e => setCantidad(e.target.value)}
                  autoFocus
                />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Stock actual: {modal.producto.stock} {modal.producto.unidad}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Nota (opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Compra proveedor X"
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarMovimiento}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}