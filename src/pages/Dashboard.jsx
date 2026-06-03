import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const PERIODOS = [
  { key: 'dia',    label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes' },
  { key: 'año',    label: 'Año' },
]

const METODO_CONFIG = {
  efectivo: { label: 'Efectivo', icon: '💵', color: '#0f6e56' },
  tarjeta:  { label: 'Tarjeta',  icon: '💳', color: '#1a56a0' },
  fri:      { label: 'Fri',      icon: '📱', color: '#854f0b' },
}

export default function Dashboard() {
  const { tieneRol } = useAuth()
  const [resumen, setResumen]           = useState(null)
  const [diarias, setDiarias]           = useState([])
  const [mensuales, setMensuales]       = useState([])
  const [stockBajo, setStockBajo]       = useState([])
  const [masVendidos, setMasVendidos]   = useState([])
  const [vistaMes, setVistaMes]         = useState(true)
  const [metodosPago, setMetodosPago]   = useState([])
  const [periodoMetodos, setPeriodo]    = useState('dia')
  const [cargandoMetodos, setCargando]  = useState(false)

  useEffect(() => {
    api.get('/dashboard/resumen').then(r => setResumen(r.data))
    api.get('/dashboard/ventas-diarias').then(r => setDiarias(
      r.data.map(d => ({
        ...d,
        dia:   new Date(d.dia).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        total: parseFloat(d.total),
      }))
    ))
    api.get('/dashboard/ventas-mensuales').then(r => setMensuales(
      r.data.map(d => ({ ...d, total: parseFloat(d.total) }))
    ))
    api.get('/dashboard/stock-bajo').then(r => setStockBajo(r.data))
    api.get('/dashboard/productos-mas-vendidos').then(r => setMasVendidos(
      r.data.map(d => ({ ...d, total: parseFloat(d.total) }))
    ))
  }, [])

  useEffect(() => {
    setCargando(true)
    api.get(`/dashboard/ventas-por-metodo?periodo=${periodoMetodos}`)
      .then(r => setMetodosPago(r.data))
      .catch(() => setMetodosPago([]))
      .finally(() => setCargando(false))
  }, [periodoMetodos])

  const fmt = (n) => `Q${Number(n || 0).toLocaleString('es', { minimumFractionDigits: 2 })}`

  const grandTotalMetodos = metodosPago.reduce((s, x) => s + parseFloat(x.total || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Dashboard</h1>
      </div>

      <div className="page-content">
        {/* Tarjetas de resumen */}
        {resumen && (
          <div className="metrics-grid" style={{ marginBottom: 24 }}>
            <div className="metric-card">
              <div className="metric-label">Ventas hoy</div>
              <div className="metric-value verde">{fmt(resumen.ventas_hoy?.total)}</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                {resumen.ventas_hoy?.cantidad} transacciones
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Ventas este mes</div>
              <div className="metric-value">{fmt(resumen.ventas_mes?.total)}</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                {resumen.ventas_mes?.cantidad} transacciones
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Productos stock bajo</div>
              <div className={`metric-value ${resumen.productos_stock_bajo > 0 ? 'rojo' : 'verde'}`}>
                {resumen.productos_stock_bajo}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Productos activos</div>
              <div className="metric-value">{resumen.total_productos}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Gráfica de ventas */}
          <div className="card card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>Ventas</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${vistaMes ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setVistaMes(true)}
                >Por mes</button>
                <button
                  className={`btn btn-sm ${!vistaMes ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setVistaMes(false)}
                >Por día</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              {vistaMes ? (
                <BarChart data={mensuales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="nombre_mes" tick={{ fontSize: 11 }}/>
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${v}`}/>
                  <Tooltip formatter={v => [fmt(v), 'Total']}/>
                  <Bar dataKey="total" fill="#1a56a0" radius={[4,4,0,0]}/>
                </BarChart>
              ) : (
                <LineChart data={diarias}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }}/>
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Q${v}`}/>
                  <Tooltip formatter={v => [fmt(v), 'Total']}/>
                  <Line type="monotone" dataKey="total" stroke="#1a56a0" strokeWidth={2} dot={false}/>
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Productos más vendidos */}
          <div className="card card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Más vendidos este mes</h3>
            {masVendidos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>
                Sin ventas registradas aún
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={masVendidos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" tick={{ fontSize: 11 }}/>
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={100}/>
                  <Tooltip/>
                  <Bar dataKey="unidades" fill="#0f6e56" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stock bajo */}
        {stockBajo.length > 0 && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--rojo)' }}>
                ⚠️ Productos con stock bajo ({stockBajo.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
              }}>
                {stockBajo.map(p => (
                  <div key={p.id} style={{
                    background: '#fff8f8', border: '1px solid #ffd0d0',
                    borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'center',
                  }}>
                    {p.imagen_url
                      ? <img src={p.imagen_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }}/>
                      : <div style={{ width: 44, height: 44, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍦</div>
                    }
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--rojo)' }}>
                        Stock: <strong>{p.stock}</strong> / Mínimo: {p.stock_minimo} {p.unidad}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--amarillo)', marginTop: 2 }}>
                        Faltan {p.faltante} {p.unidad}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {stockBajo.length === 0 && resumen && (
          <div className="card card-body" style={{ textAlign: 'center', color: 'var(--verde)' }}>
            <p style={{ fontSize: 16 }}>✅ Todos los productos tienen stock suficiente</p>
          </div>
        )}

        {/* Ventas por método de pago */}
        <div className="card card-body" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontWeight: 700 }}>💰 Ventas por método de pago</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {PERIODOS.map(p => (
                  <button
                    key={p.key}
                    className={`btn btn-sm ${periodoMetodos === p.key ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPeriodo(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {cargandoMetodos ? (
              <div className="loading-center"><div className="spinner"/> Cargando...</div>
            ) : (
              <>
                {/* Tarjetas grandes por método */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                  {['efectivo', 'tarjeta', 'fri'].map(m => {
                    const cfg      = METODO_CONFIG[m]
                    const dato     = metodosPago.find(x => x.metodo === m)
                    const total    = parseFloat(dato?.total    || 0)
                    const cantidad = parseInt  (dato?.cantidad || 0)
                    const pct      = grandTotalMetodos > 0 ? Math.round((total / grandTotalMetodos) * 100) : 0
                    return (
                      <div key={m} style={{
                        borderRadius: 12, padding: '20px 18px',
                        background: cfg.color + '0f',
                        border: `1.5px solid ${cfg.color}30`,
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>{cfg.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: cfg.color, marginBottom: 4 }}>
                          {fmt(total)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                          {cantidad} {cantidad === 1 ? 'transacción' : 'transacciones'}
                        </div>
                        <div style={{
                          display: 'inline-block', fontSize: 13, fontWeight: 700,
                          color: cfg.color, background: cfg.color + '20',
                          padding: '3px 12px', borderRadius: 20,
                        }}>
                          {pct}% del total
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Barra de distribución proporcional */}
                {grandTotalMetodos > 0 && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      Distribución — Total: <strong>{fmt(grandTotalMetodos)}</strong>
                    </div>
                    <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
                      {['efectivo', 'tarjeta', 'fri'].map(m => {
                        const dato  = metodosPago.find(x => x.metodo === m)
                        const total = parseFloat(dato?.total || 0)
                        const pct   = grandTotalMetodos > 0 ? (total / grandTotalMetodos) * 100 : 0
                        if (pct === 0) return null
                        return (
                          <div key={m} title={`${METODO_CONFIG[m].label}: ${fmt(total)}`}
                            style={{ width: `${pct}%`, background: METODO_CONFIG[m].color, transition: 'width 0.4s ease' }}
                          />
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      {['efectivo', 'tarjeta', 'fri'].map(m => (
                        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: METODO_CONFIG[m].color }}/>
                          {METODO_CONFIG[m].label}
                        </div>
                      ))}
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