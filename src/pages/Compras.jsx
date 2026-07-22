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
    const b   = []
    const add = (...bytes) => bytes.forEach(x => b.push(x))
    const safe = s => s
      .replace(/[áàâä]/gi,'a').replace(/[éèêë]/gi,'e')
      .replace(/[íìîï]/gi,'i').replace(/[óòôö]/gi,'o')
      .replace(/[úùûü]/gi,'u').replace(/[ñ]/gi,'n')
      .replace(/[¡¿]/g,'')
    const ln = (str = '') => {
      const s = safe(String(str))
      for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xFF)
      add(0x0A)
    }
    const sep = () => ln('----------------------------------------')

    const fecha = new Date().toLocaleString('es', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    })

    add(0x1B, 0x40)           // init
    add(0x1B, 0x61, 0x01)    // centrar
    add(0x1B, 0x45, 0x01)    // negrita
    add(0x1D, 0x21, 0x11)    // doble tamaño
    ln('HELADERIA SARITA')
    add(0x1D, 0x21, 0x00)
    add(0x1B, 0x45, 0x00)
    add(0x0A)
    add(0x1B, 0x45, 0x01)
    ln('*** CIERRE DEL DIA ***')
    add(0x1B, 0x45, 0x00)
    add(0x1B, 0x61, 0x00)    // izquierda
    add(0x0A)
    sep()
    ln(`Fecha: ${fecha}`)
    sep()

    // Ventas
    add(0x1B, 0x45, 0x01)
    ln('VENTAS DEL DIA')
    add(0x1B, 0x45, 0x00)
    ln(`Total ventas:    Q${parseFloat(datos.total_ventas || datos.total_ventas_efectivo + datos.total_ventas_tarjeta + datos.total_ventas_fri || 0).toFixed(2)}`)
    ln(`  Efectivo:      Q${parseFloat(datos.total_ventas_efectivo).toFixed(2)}`)
    ln(`  Tarjeta:       Q${parseFloat(datos.total_ventas_tarjeta).toFixed(2)}`)
    ln(`  Fri:           Q${parseFloat(datos.total_ventas_fri).toFixed(2)}`)
    ln(`  Transacciones: ${datos.cantidad_ventas}`)
    sep()

    // Compras
    add(0x1B, 0x45, 0x01)
    ln('COMPRAS DEL DIA')
    add(0x1B, 0x45, 0x00)
    ln(`Total compras:   Q${parseFloat(datos.total_compras).toFixed(2)}`)
    sep()

    // Efectivo neto
    add(0x1B, 0x61, 0x01)    // centrar
    add(0x1B, 0x45, 0x01)
    add(0x1D, 0x21, 0x11)
    ln(`EFECTIVO NETO`)
    ln(`Q${parseFloat(datos.efectivo_neto).toFixed(2)}`)
    add(0x1D, 0x21, 0x00)
    add(0x1B, 0x45, 0x00)
    add(0x1B, 0x61, 0x00)
    sep()
    add(0x1B, 0x61, 0x01)
    ln('Gracias!')
    add(0x0A, 0x0A, 0x0A)
    add(0x1D, 0x56, 0x41, 0x00) // cortar

    // Enviar a RawBT via HTTP API
    const uint8 = new Uint8Array(b)
    fetch('http://localhost:8080/rawbt', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: uint8,
    })
      .then(() => toast.success('Imprimiendo cierre...'))
      .catch(() => toast.error('No se pudo conectar con RawBT. Activa el HTTP API en la app.'))
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
                        {new Date(c.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
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