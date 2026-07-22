import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function Compras() {
  const [compras, setCompras]     = useState([])
  const [resumen, setResumen]     = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto]         = useState('')
  const [cargando, setCargando]   = useState(false)
  const [cerrando, setCerrando]   = useState(false)
  const [ticketCierre, setTicketCierre] = useState(null)
  const { tieneRol }              = useAuth()

  const cargar = async () => {
    try {
      const [c, r] = await Promise.all([
        api.get('/compras/hoy'),
        api.get('/compras/resumen-hoy'),
      ])
      setCompras(c.data)
      setResumen(r.data)
    } catch {
      toast.error('Error al cargar los datos')
    }
  }

  useEffect(() => { cargar() }, [])

  const agregarCompra = async () => {
    if (!descripcion || !monto || parseFloat(monto) <= 0) {
      toast.error('Ingresa descripción y monto válido'); return
    }
    setCargando(true)
    try {
      await api.post('/compras', { descripcion, monto: parseFloat(monto) })
      toast.success('Compra registrada')
      setDescripcion(''); setMonto('')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error')
    } finally {
      setCargando(false)
    }
  }

  const eliminarCompra = async (id) => {
    if (!confirm('¿Eliminar esta compra?')) return
    try {
      await api.delete(`/compras/${id}`)
      toast.success('Compra eliminada')
      cargar()
    } catch {
      toast.error('Error al eliminar la compra')
    }
  }

  const realizarCierre = async () => {
    if (!confirm('¿Confirmar el cierre del día? Esta acción no se puede deshacer.')) return
    setCerrando(true)
    try {
      const { data } = await api.post('/compras/cierre')
      setTicketCierre(data)
      toast.success('Cierre realizado correctamente')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al realizar el cierre')
    } finally {
      setCerrando(false)
    }
  }

  const imprimirCierre = (datos) => {
    const fecha = new Date().toLocaleString('es', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Guatemala',
    })
    const fmtQ = n => `Q${parseFloat(n || 0).toFixed(2)}`
    const totalVentas = parseFloat(datos.total_ventas || 0)
    const neto = parseFloat(datos.efectivo_neto || 0)

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Cierre del día — ${fecha}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a202c;padding:24px;max-width:420px;margin:0 auto}
  h1{font-size:22px;font-weight:800;text-align:center;margin-bottom:2px}
  .sub{text-align:center;color:#718096;font-size:12px;margin-bottom:20px}
  .sep{border:none;border-top:1px dashed #cbd5e0;margin:14px 0}
  .section-title{font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
  .row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
  .row.indent{padding-left:16px;color:#718096}
  .row.bold{font-weight:700}
  .neto{text-align:center;margin-top:16px;padding:16px;background:#f0fdf4;border-radius:10px;border:1.5px solid #86efac}
  .neto-label{font-size:12px;color:#4ade80;font-weight:700;text-transform:uppercase;margin-bottom:4px}
  .neto-valor{font-size:32px;font-weight:800;color:#16a34a}
  .neto-neg{background:#fef2f2;border-color:#fca5a5}
  .neto-neg .neto-label{color:#f87171}
  .neto-neg .neto-valor{color:#dc2626}
  @media print{body{padding:10px}}
</style></head><body>
<h1>Heladería Sarita</h1>
<p class="sub">Cierre del día &nbsp;·&nbsp; ${fecha}</p>
<hr class="sep">

<div class="section-title">Ventas del día</div>
<div class="row bold"><span>Total ventas</span><span style="color:#16a34a">${fmtQ(totalVentas)}</span></div>
<div class="row indent"><span>Efectivo</span><span>${fmtQ(datos.total_ventas_efectivo)}</span></div>
<div class="row indent"><span>Tarjeta</span><span>${fmtQ(datos.total_ventas_tarjeta)}</span></div>
<div class="row indent"><span>Fri</span><span>${fmtQ(datos.total_ventas_fri)}</span></div>
<div class="row indent"><span>Transacciones</span><span>${datos.cantidad_ventas}</span></div>

<hr class="sep">
<div class="section-title">Compras del día</div>
<div class="row bold"><span>Total compras</span><span style="color:#dc2626">− ${fmtQ(datos.total_compras)}</span></div>

<hr class="sep">
<div class="neto ${neto < 0 ? 'neto-neg' : ''}">
  <div class="neto-label">Efectivo neto</div>
  <div class="neto-valor">${fmtQ(neto)}</div>
</div>

<script>window.onload=()=>{window.print()}</script>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const fmt = (n) => `Q${parseFloat(n || 0).toFixed(2)}`

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🛍️ Compras del día</h1>
        <button className="btn btn-outline btn-sm" onClick={cargar}>🔄 Actualizar</button>
      </div>

      <div className="page-content" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── LISTA DE COMPRAS ── */}
        <div>
          {/* Formulario agregar compra */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Registrar compra</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input
                    className="form-control"
                    placeholder="Ej: Compra de insumos"
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && agregarCompra()}
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
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && agregarCompra()}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={agregarCompra}
                disabled={cargando}
              >
                {cargando ? 'Guardando...' : '+ Agregar compra'}
              </button>
            </div>
          </div>

          {/* Tabla de compras del día */}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Monto</th>
                    <th>Usuario</th>
                    <th>Hora</th>
                    {tieneRol('admin') && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {compras.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No hay compras registradas hoy
                    </td></tr>
                  ) : compras.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.descripcion}</td>
                      <td style={{ color: 'var(--rojo)', fontWeight: 700 }}>
                        Q{parseFloat(c.monto).toFixed(2)}
                      </td>
                      <td className="text-muted">{c.usuario}</td>
                      <td className="text-muted">
                        {new Date(c.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' })}
                      </td>
                      {tieneRol('admin') && (
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => eliminarCompra(c.id)}>
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── PANEL DERECHO: RESUMEN Y CIERRE ── */}
        <div>
          {/* Resumen del día */}
          {resumen && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Resumen del día</h3>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                    VENTAS
                  </p>
                  {[
                    { label: 'Total ventas',  value: resumen.total_ventas,    color: 'var(--verde)' },
                    { label: '  Efectivo',    value: resumen.ventas_efectivo, color: 'var(--text)' },
                    { label: '  Tarjeta',     value: resumen.ventas_tarjeta,  color: 'var(--text)' },
                    { label: '  Fri',         value: resumen.ventas_fri,      color: 'var(--text)' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                      <span style={{ fontWeight: 600, color: r.color }}>{fmt(r.value)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                    COMPRAS
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total compras</span>
                    <span style={{ fontWeight: 600, color: 'var(--rojo)' }}>
                      − {fmt(resumen.total_compras)}
                    </span>
                  </div>
                </div>

                <div style={{
                  borderTop: '2px solid var(--border)', paddingTop: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Efectivo neto</span>
                  <span style={{
                    fontWeight: 700, fontSize: 20,
                    color: resumen.efectivo_neto >= 0 ? 'var(--verde)' : 'var(--rojo)',
                  }}>
                    {fmt(resumen.efectivo_neto)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botón de cierre */}
          {ticketCierre ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Cierre realizado</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Efectivo neto: {fmt(ticketCierre.efectivo_neto)}
                </p>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => imprimirCierre(ticketCierre)}
                >
                  🖨️ Imprimir ticket de cierre
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-danger w-full"
              style={{ padding: '14px', fontSize: 15 }}
              onClick={realizarCierre}
              disabled={cerrando}
            >
              {cerrando ? 'Procesando...' : '🔒 Realizar cierre del día'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}