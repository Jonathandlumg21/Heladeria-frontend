import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function Inventario() {
  const [productos, setProductos]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [filtro, setFiltro]               = useState('')
  const [estado, setEstado]               = useState('')
  const [modal, setModal]                 = useState(null)
  const [cantidad, setCantidad]           = useState('')
  const [nota, setNota]                   = useState('')
  const [stockData, setStockData]         = useState([])
  const [cargandoStock, setCargandoStock] = useState(false)
  const [stockCargado, setStockCargado]   = useState(false)
  const { tieneRol }                      = useAuth()

  const cargarStock = async () => {
    setCargandoStock(true)
    try {
      const { data } = await api.get('/reportes/stock')
      setStockData(data)
      setStockCargado(true)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.status || err.message
      toast.error(`Error al cargar stock: ${msg}`)
    } finally {
      setCargandoStock(false)
    }
  }

  const descargarStockPDF = () => {
    const sinStock  = stockData.filter(p => p.estado === 'sin_stock')
    const bajoStock = stockData.filter(p => p.estado === 'bajo_stock')
    const fecha = new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const fila = (p, tipo) => `
      <tr>
        <td style="font-weight:600">${p.nombre}</td>
        <td style="color:#718096">${p.categoria || '—'}</td>
        <td style="color:#718096">${p.unidad || '—'}</td>
        <td style="font-weight:700;color:${tipo === 'sin' ? '#a32d2d' : '#854f0b'}">${p.stock}</td>
        <td>${p.stock_minimo ?? '—'}</td>
        <td style="font-weight:700;color:#a32d2d">${p.faltante || '—'}</td>
      </tr>`

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Reporte de Stock — ${fecha}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#1a202c;padding:24px}
  h1{font-size:20px;margin-bottom:2px}
  .sub{color:#718096;font-size:12px;margin-bottom:24px}
  h2{font-size:14px;margin:20px 0 8px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{text-align:left;padding:8px 10px;font-size:11px;color:#718096;text-transform:uppercase;border-bottom:2px solid #e2e8f0;background:#f8fafc}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
  .ok{color:#0f6e56;font-weight:700;font-size:14px}
  @media print{body{padding:16px}}
</style></head><body>
<h1>📦 Reporte de Stock</h1>
<p class="sub">Heladería Sarita &nbsp;·&nbsp; Generado el ${fecha}</p>
${sinStock.length > 0 ? `
<h2 style="color:#a32d2d">❌ Sin stock — ${sinStock.length} producto${sinStock.length > 1 ? 's' : ''}</h2>
<table><thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th>Stock</th><th>Mínimo</th><th>Faltante</th></tr></thead>
<tbody>${sinStock.map(p => fila(p, 'sin')).join('')}</tbody></table>` : ''}
${bajoStock.length > 0 ? `
<h2 style="color:#854f0b">⚠️ Stock bajo — ${bajoStock.length} producto${bajoStock.length > 1 ? 's' : ''}</h2>
<table><thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th>Stock actual</th><th>Mínimo</th><th>Faltante</th></tr></thead>
<tbody>${bajoStock.map(p => fila(p, 'bajo')).join('')}</tbody></table>` : ''}
${sinStock.length === 0 && bajoStock.length === 0 ? '<p class="ok">✅ Todos los productos tienen stock suficiente.</p>' : ''}
<script>window.onload=()=>{window.print()}</script>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const cargar = () => {
    setLoading(true)
    api.get('/inventario').then(r => setProductos(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  // Productos cuyo stock es derivado: no tienen estado propio gestionable
  const esDerivado = (p) => p.tipo === 'compuesto' || p.categoria === 'Especialidades'

  const filtrados = productos.filter(p => {
    if (p.categoria === 'Especialidades') return false
    const okNombre = p.nombre.toLowerCase().includes(filtro.toLowerCase())
    if (estado && esDerivado(p)) return false
    const okEstado = !estado || p.estado_stock === estado
    return okNombre && okEstado
  })

  const simples = productos.filter(p => !esDerivado(p))
  const stats = {
    total:    productos.filter(p => p.categoria !== 'Especialidades').length,
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
    if (esDerivado(p))                 return <span className="badge badge-admin">Derivado</span>
    if (p.estado_stock === 'sin_stock') return <span className="badge badge-sinstock">Sin stock</span>
    if (p.estado_stock === 'bajo')      return <span className="badge badge-bajo">Stock bajo</span>
    return <span className="badge badge-ok">OK</span>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📦 Inventario</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={cargarStock} disabled={cargandoStock}>
            {cargandoStock ? '⏳ Generando...' : '📄 Reporte de stock'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={cargar}>🔄 Actualizar</button>
        </div>
      </div>

      <div className="page-content">

        {/* ── REPORTE DE STOCK ── */}
        {(cargandoStock || stockCargado) && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>📄 Reporte de stock</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={cargarStock} disabled={cargandoStock}>
                  {cargandoStock ? '⏳ Actualizando...' : '🔄 Actualizar'}
                </button>
                {stockCargado && (
                  <button className="btn btn-primary btn-sm" onClick={descargarStockPDF}>
                    📄 Descargar PDF
                  </button>
                )}
              </div>
            </div>

            {cargandoStock ? (
              <div className="loading-center"><div className="spinner"/> Cargando stock...</div>
            ) : stockCargado && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                  <div className="metric-card">
                    <div className="metric-label">Total con alerta</div>
                    <div className={`metric-value ${stockData.filter(p => p.estado !== 'ok').length > 0 ? 'rojo' : 'verde'}`}>
                      {stockData.filter(p => p.estado !== 'ok').length}
                    </div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>productos</div>
                  </div>
                  <div className="metric-card" style={{ borderLeft: '4px solid var(--rojo)' }}>
                    <div className="metric-label">Sin stock</div>
                    <div className="metric-value rojo">{stockData.filter(p => p.estado === 'sin_stock').length}</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>agotados</div>
                  </div>
                  <div className="metric-card" style={{ borderLeft: '4px solid var(--amarillo)' }}>
                    <div className="metric-label">Stock bajo</div>
                    <div className="metric-value amarillo">{stockData.filter(p => p.estado === 'bajo_stock').length}</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>por debajo del mínimo</div>
                  </div>
                </div>

                {stockData.filter(p => p.estado !== 'ok').length === 0 ? (
                  <div className="card card-body" style={{ textAlign: 'center', color: 'var(--verde)' }}>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>✅ Todos los productos tienen stock suficiente</p>
                  </div>
                ) : (
                  <div className="card">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Unidad</th>
                            <th style={{ textAlign: 'right' }}>Stock actual</th>
                            <th style={{ textAlign: 'right' }}>Mínimo</th>
                            <th style={{ textAlign: 'right' }}>Faltante</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockData.filter(p => p.estado !== 'ok').map(p => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.categoria || '—'}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.unidad || '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: p.estado === 'sin_stock' ? 'var(--rojo)' : 'var(--amarillo)' }}>
                                {p.stock}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.stock_minimo ?? '—'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--rojo)' }}>{p.faltante > 0 ? p.faltante : '—'}</td>
                              <td>
                                {p.estado === 'sin_stock'
                                  ? <span className="badge badge-sinstock">Sin stock</span>
                                  : <span className="badge badge-bajo">Stock bajo</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
            <hr style={{ border: 'none', borderTop: '2px solid var(--border)', margin: '24px 0' }} />
          </div>
        )}

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
                          {!esDerivado(p) && (
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