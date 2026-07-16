import { useState, useEffect } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const HOY  = new Date().toISOString().slice(0, 10)
const PRIMER_DIA = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().slice(0, 10)

const METODO_CONFIG = {
  efectivo: { label: 'Efectivo', icon: '💵', color: '#0f6e56' },
  tarjeta:  { label: 'Tarjeta',  icon: '💳', color: '#1a56a0' },
  fri:      { label: 'Fri',      icon: '📱', color: '#854f0b' },
}

export default function Reportes() {
  const [desde, setDesde]         = useState(PRIMER_DIA)
  const [hasta, setHasta]         = useState(HOY)
  const [metodo, setMetodo]       = useState('')
  const [ventas, setVentas]       = useState([])
  const [cargando, setCargando]   = useState(false)
  const [detalle, setDetalle]     = useState(null)
  const [cargandoDet, setCargDet] = useState(false)
  const [buscado, setBuscado]     = useState(false)

  const [stockData, setStockData]         = useState([])
  const [cargandoStock, setCargandoStock] = useState(false)
  const [stockCargado, setStockCargado]   = useState(false)

  const buscar = async () => {
    setCargando(true)
    setBuscado(true)
    try {
      const params = new URLSearchParams({ desde, hasta })
      if (metodo) params.set('metodo', metodo)
      const { data } = await api.get(`/ventas/reporte?${params}`)
      setVentas(data)
    } catch {
      toast.error('Error al cargar el reporte')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { buscar(); cargarStock() }, [])

  const cargarStock = async () => {
    setCargandoStock(true)
    try {
      const { data } = await api.get('/dashboard/stock-bajo')
      setStockData(data)
      setStockCargado(true)
    } catch {
      toast.error('Error al cargar reporte de stock')
    } finally {
      setCargandoStock(false)
    }
  }

  const descargarStockPDF = () => {
    const sinStock  = stockData.filter(p => p.stock === 0)
    const bajoStock = stockData.filter(p => p.stock > 0)
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

${stockData.length === 0 ? '<p class="ok">✅ Todos los productos tienen stock suficiente.</p>' : ''}

<script>window.onload=()=>{window.print()}</script>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const verDetalle = async (id) => {
    if (detalle?.id === id) { setDetalle(null); return }
    setCargDet(true)
    try {
      const { data } = await api.get(`/ventas/${id}`)
      setDetalle(data)
    } catch {
      toast.error('Error al cargar el detalle')
    } finally {
      setCargDet(false)
    }
  }

  const fmt = (n) => `Q${Number(n || 0).toLocaleString('es', { minimumFractionDigits: 2 })}`

  const fmtFecha = (iso) => new Date(iso).toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const totalGeneral  = ventas.reduce((s, v) => s + parseFloat(v.total), 0)
  const porMetodo     = ['efectivo', 'tarjeta', 'fri'].map(m => ({
    metodo: m,
    total: ventas.filter(v => v.metodo_pago === m).reduce((s, v) => s + parseFloat(v.total), 0),
    cantidad: ventas.filter(v => v.metodo_pago === m).length,
  }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 Reportes de ventas</h1>
      </div>

      <div className="page-content">

        {/* Filtros */}
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Desde</label>
              <input type="date" className="form-control" value={desde}
                onChange={e => setDesde(e.target.value)} style={{ width: 160 }}/>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hasta</label>
              <input type="date" className="form-control" value={hasta}
                onChange={e => setHasta(e.target.value)} style={{ width: 160 }}/>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Método de pago</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ key: '', label: 'Todos' }, ...Object.entries(METODO_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(op => (
                  <button key={op.key}
                    className={`btn btn-sm ${metodo === op.key ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMetodo(op.key)}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={buscar} disabled={cargando}>
              {cargando ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Resumen por método */}
        {buscado && !cargando && ventas.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="metric-card">
              <div className="metric-label">Total ventas</div>
              <div className="metric-value verde">{fmt(totalGeneral)}</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{ventas.length} tickets</div>
            </div>
            {porMetodo.map(({ metodo: m, total, cantidad }) => {
              const cfg = METODO_CONFIG[m]
              return (
                <div key={m} className="metric-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                  <div className="metric-label">{cfg.icon} {cfg.label}</div>
                  <div className="metric-value" style={{ fontSize: 22, color: cfg.color }}>{fmt(total)}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{cantidad} tickets</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tabla de tickets */}
        <div className="card">
          {cargando ? (
            <div className="loading-center"><div className="spinner"/> Cargando...</div>
          ) : !buscado ? null : ventas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧾</div>
              <p>No hay ventas en ese período</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th># Ticket</th>
                    <th>Fecha y hora</th>
                    <th>Vendedor</th>
                    <th>Método</th>
                    <th>Items</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => {
                    const cfg        = METODO_CONFIG[v.metodo_pago]
                    const abierto    = detalle?.id === v.id
                    return (
                      <>
                        <tr key={v.id} style={{ background: abierto ? '#f0f6ff' : undefined }}>
                          <td style={{ fontWeight: 700 }}>#{v.id}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fmtFecha(v.fecha)}</td>
                          <td>{v.vendedor}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 12, fontWeight: 600, color: cfg.color,
                              background: cfg.color + '15', padding: '3px 10px', borderRadius: 20,
                            }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{v.num_items} productos</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(v.total)}</td>
                          <td>
                            <button
                              className={`btn btn-sm ${abierto ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => verDetalle(v.id)}
                              disabled={cargandoDet && !abierto}
                            >
                              {abierto ? '▲ Cerrar' : '▼ Ver detalle'}
                            </button>
                          </td>
                        </tr>

                        {/* Detalle expandible */}
                        {abierto && detalle && (
                          <tr key={`det-${v.id}`}>
                            <td colSpan={7} style={{ padding: 0, background: '#f7faff' }}>
                              <div style={{ padding: '14px 24px' }}>
                                <table style={{ width: '100%', fontSize: 13 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ background: 'transparent', color: 'var(--text-muted)', paddingLeft: 0 }}>Producto</th>
                                      <th style={{ background: 'transparent', color: 'var(--text-muted)', textAlign: 'center' }}>Cantidad</th>
                                      <th style={{ background: 'transparent', color: 'var(--text-muted)', textAlign: 'right' }}>Precio unit.</th>
                                      <th style={{ background: 'transparent', color: 'var(--text-muted)', textAlign: 'right' }}>Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalle.detalle.map((item, i) => (
                                      <tr key={i}>
                                        <td style={{ paddingLeft: 0, borderBottom: '1px solid var(--border)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {item.imagen_url
                                              ? <img src={item.imagen_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}/>
                                              : <span style={{ fontSize: 18 }}>🍦</span>
                                            }
                                            {item.producto}
                                          </div>
                                        </td>
                                        <td style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{item.cantidad}</td>
                                        <td style={{ textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{fmt(item.precio_unitario)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                                          {fmt(parseFloat(item.precio_unitario) * item.cantidad)}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, paddingRight: 12, border: 'none' }}>Total</td>
                                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: 'var(--azul)', border: 'none' }}>
                                        {fmt(detalle.total)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── REPORTE DE STOCK ── */}
        <div style={{ marginTop: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16, flexWrap: 'wrap', gap: 10,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>📦 Reporte de stock</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={cargarStock} disabled={cargandoStock}>
                {cargandoStock ? 'Cargando...' : '🔄 Actualizar'}
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
              {/* Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                <div className="metric-card">
                  <div className="metric-label">Total con alerta</div>
                  <div className={`metric-value ${stockData.length > 0 ? 'rojo' : 'verde'}`}>{stockData.length}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>productos</div>
                </div>
                <div className="metric-card" style={{ borderLeft: '4px solid var(--rojo)' }}>
                  <div className="metric-label">Sin stock</div>
                  <div className="metric-value rojo">{stockData.filter(p => p.stock === 0).length}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>agotados</div>
                </div>
                <div className="metric-card" style={{ borderLeft: '4px solid var(--amarillo)' }}>
                  <div className="metric-label">Stock bajo</div>
                  <div className="metric-value amarillo">{stockData.filter(p => p.stock > 0).length}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>por debajo del mínimo</div>
                </div>
              </div>

              {stockData.length === 0 ? (
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
                        {stockData.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.categoria || '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.unidad || '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: p.stock === 0 ? 'var(--rojo)' : 'var(--amarillo)' }}>
                              {p.stock}
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{p.stock_minimo ?? '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--rojo)' }}>{p.faltante || '—'}</td>
                            <td>
                              {p.stock === 0
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
        </div>

      </div>
    </div>
  )
}
