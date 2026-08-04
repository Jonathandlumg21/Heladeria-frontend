import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const METODOS = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'tarjeta',  label: 'Tarjeta',  icon: '💳' },
  { value: 'fri',      label: 'Fri',      icon: '📱' },
]

const METODO_LABEL = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', fri: 'Fri' }


export default function Ventas() {
  const [productos, setProductos]   = useState([])
  const [carrito, setCarrito]       = useState([])
  const [metodo, setMetodo]         = useState('efectivo')
  const [busqueda, setBusqueda]     = useState('')
  const [categoria, setCategoria]   = useState('')
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [cobrando, setCobrando]     = useState(false)
  const [pagaCon, setPagaCon]       = useState('')
  const [recibo, setRecibo]         = useState(null)

  const cargarProductos = () => {
    setLoading(true)
    api.get('/productos/pos/disponibles')
      .then(r => {
        setProductos(r.data)
        const cats = [...new Set(r.data.map(p => p.categoria).filter(Boolean))]
        setCategorias(cats)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargarProductos() }, [])

  const productosFiltrados = productos.filter(p => {
    const okNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const okCat    = !categoria || p.categoria === categoria
    return okNombre && okCat
  })

  const agregar = (p) => {
    if (p.unidades_disponibles === 0) return
    setCarrito(c => {
      const existe = c.find(x => x.id === p.id)
      if (existe) {
        if (existe.cantidad >= p.unidades_disponibles) {
          toast.error(`Solo hay ${p.unidades_disponibles} disponibles`)
          return c
        }
        return c.map(x => x.id === p.id ? { ...x, cantidad: x.cantidad + 1 } : x)
      }
      return [...c, { ...p, cantidad: 1 }]
    })
  }

  const quitarUno = (id) =>
    setCarrito(c => c.map(x => x.id === id
      ? { ...x, cantidad: x.cantidad - 1 } : x
    ).filter(x => x.cantidad > 0))

  const quitarDelCarrito = (id) =>
    setCarrito(c => c.filter(x => x.id !== id))

  const total      = carrito.reduce((s, i) => s + parseFloat(i.precio) * i.cantidad, 0)
  const pagaConNum = parseFloat(pagaCon) || 0
  const vuelto     = metodo === 'efectivo' && pagaConNum > 0 ? pagaConNum - total : null

  const imprimirTicket = (ventaId, totalVenta, metodoUsado, itemsVendidos, pagoCliente) => {
    setRecibo({ ventaId, totalVenta, metodoUsado, itemsVendidos, pagoCliente,
      fecha: new Date().toLocaleString('es', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Guatemala',
      })
    })
  }

  const handleImprimir = () => {
    if (!recibo) return

    const fmtQ = n => `Q${parseFloat(n || 0).toFixed(2)}`
    const vuelto = recibo.metodoUsado === 'efectivo' && recibo.pagoCliente > 0
      ? recibo.pagoCliente - parseFloat(recibo.totalVenta)
      : null

    const filas = recibo.itemsVendidos.map(i => `
      <tr>
        <td style="font-weight:600">${i.nombre}</td>
        <td style="text-align:center;color:#718096">${i.cantidad}</td>
        <td style="text-align:right;color:#718096">${fmtQ(i.precio)}</td>
        <td style="text-align:right;font-weight:700">${fmtQ(parseFloat(i.precio) * i.cantidad)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Ticket #${recibo.ventaId}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a202c;padding:24px;max-width:420px;margin:0 auto}
  h1{font-size:22px;font-weight:800;text-align:center;margin-bottom:2px}
  .sub{text-align:center;color:#718096;font-size:12px;margin-bottom:4px}
  .ticket-num{text-align:center;font-size:12px;font-weight:700;color:#1a56a0;margin-bottom:20px}
  .sep{border:none;border-top:1px dashed #cbd5e0;margin:14px 0}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  th{font-size:11px;color:#718096;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:left}
  td{padding:7px 6px;border-bottom:1px solid #f1f5f9}
  .total-box{text-align:center;margin-top:16px;padding:14px;background:#eff6ff;border-radius:10px;border:1.5px solid #93c5fd}
  .total-label{font-size:11px;color:#1a56a0;font-weight:700;text-transform:uppercase;margin-bottom:4px}
  .total-valor{font-size:32px;font-weight:800;color:#1a56a0}
  .pago-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
  .gracias{text-align:center;margin-top:18px;font-weight:700;color:#0f6e56;font-size:14px}
  @media print{body{padding:10px}}
</style></head><body>
<h1>Heladería Sarita</h1>
<p class="sub">${recibo.fecha}</p>
<p class="ticket-num">Ticket #${recibo.ventaId}</p>
<hr class="sep">
<table>
  <thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<hr class="sep">
<div class="total-box">
  <div class="total-label">Total</div>
  <div class="total-valor">${fmtQ(recibo.totalVenta)}</div>
</div>
${recibo.metodoUsado === 'efectivo' && recibo.pagoCliente > 0 ? `
<div style="margin-top:12px">
  <div class="pago-row"><span style="color:#718096">Entrega</span><span>${fmtQ(recibo.pagoCliente)}</span></div>
  <div class="pago-row"><span style="font-weight:700">Vuelto</span><span style="font-weight:700;color:${vuelto >= 0 ? '#16a34a' : '#dc2626'}">${fmtQ(vuelto)}</span></div>
</div>` : ''}
<div style="margin-top:10px">
  <div class="pago-row"><span style="color:#718096">Método de pago</span><span style="font-weight:600">${METODO_LABEL[recibo.metodoUsado]}</span></div>
</div>
<p class="gracias">¡Gracias por su compra!</p>
<script>window.onload=()=>{window.print()}</script>
</body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }
  // ── Cobrar ──
  const cobrar = async () => {
    if (!carrito.length) { toast.error('El carrito está vacío'); return }
    setCobrando(true)
    try {
      const { data } = await api.post('/ventas', {
        items: carrito.map(i => ({
          producto_id:     i.id,
          cantidad:        i.cantidad,
          precio_unitario: i.precio,
        })),
        metodo_pago: metodo,
      })
      toast.success(`¡Venta registrada! Total: Q${total.toFixed(2)}`)
      imprimirTicket(data.venta_id, total.toFixed(2), metodo, carrito, pagaConNum)
      setCarrito([])
      setPagaCon('')
      cargarProductos()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar la venta')
    } finally {
      setCobrando(false)
    }
  }

  const getBadgeStock = (p) => {
    if (p.unidades_disponibles === 0)  return { texto: 'Agotado',                       cls: 'badge-sinstock' }
    if (p.unidades_disponibles <= 3)   return { texto: `Solo ${p.unidades_disponibles}`, cls: 'badge-bajo' }
    return { texto: `${p.unidades_disponibles} disp.`, cls: 'badge-ok' }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🛒 Punto de venta</h1>
        <button className="btn btn-outline btn-sm" onClick={cargarProductos}>
          🔄 Actualizar
        </button>
      </div>

      <div className="page-content pos-layout" style={{
        display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start'
      }}>

        {/* ── CATÁLOGO ── */}
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              className="form-control"
              style={{ flex: 1, minWidth: 160 }}
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <select
              className="form-control"
              style={{ width: 180 }}
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner"/> Cargando...</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍦</div>
              <p>No hay productos disponibles</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
              gap: 12,
            }}>
              {productosFiltrados.map(p => {
                const badge     = getBadgeStock(p)
                const enCarrito = carrito.find(x => x.id === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => agregar(p)}
                    disabled={p.unidades_disponibles === 0}
                    style={{
                      background:   enCarrito ? '#eef4ff' : '#fff',
                      border:       enCarrito ? '2px solid var(--azul)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding:      12,
                      cursor:       p.unidades_disponibles === 0 ? 'not-allowed' : 'pointer',
                      textAlign:    'center',
                      opacity:      p.unidades_disponibles === 0 ? 0.5 : 1,
                      transition:   'all 0.15s',
                    }}
                  >
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                      />
                    ) : (
                      <div style={{
                        height: 90, background: 'var(--bg)', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 36, marginBottom: 8,
                      }}>🍦</div>
                    )}
                    <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, lineHeight: 1.3 }}>
                      {p.nombre}
                    </p>
                    <p style={{ color: 'var(--azul)', fontWeight: 700, fontSize: 14, marginBottom: 5 }}>
                      Q{parseFloat(p.precio).toFixed(2)}
                    </p>
                    <span className={`badge ${badge.cls}`} style={{ fontSize: 10 }}>
                      {badge.texto}
                    </span>
                    {p.tipo === 'compuesto' && p.unidades_disponibles <= 5 && p.ingrediente_limitante && (
                      <p style={{ fontSize: 10, color: 'var(--amarillo)', marginTop: 3 }}>
                        Falta: {p.ingrediente_limitante}
                      </p>
                    )}
                    {enCarrito && (
                      <div style={{
                        marginTop: 5, background: 'var(--azul)', color: '#fff',
                        borderRadius: 20, fontSize: 12, padding: '2px 8px', display: 'inline-block',
                      }}>
                        en carrito: {enCarrito.cantidad}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── CARRITO ── */}
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Carrito</h3>

            {recibo ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Venta registrada</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                  Total: Q{recibo.totalVenta}
                </p>
                <button
                  className="btn btn-primary w-full"
                  style={{ marginBottom: 10, fontSize: 15, padding: '12px' }}
                  onClick={handleImprimir}
                >
                  🖨️ Imprimir ticket
                </button>
                <button
                  className="btn btn-outline w-full"
                  onClick={() => setRecibo(null)}
                >
                  Nueva venta
                </button>
              </div>
            ) : carrito.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Selecciona productos del catálogo
              </p>
            ) : (
              <div style={{ marginBottom: 12 }}>
                {carrito.map(i => (
                  <div key={i.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingBottom: 10, marginBottom: 10,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: 13 }}>{i.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Q{parseFloat(i.precio).toFixed(2)} c/u
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button onClick={() => quitarUno(i.id)} style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: '1px solid var(--border)', background: '#fff',
                        cursor: 'pointer', fontSize: 14, lineHeight: 1,
                      }}>−</button>
                      <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
                        {i.cantidad}
                      </span>
                      <button onClick={() => agregar(i)} style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: '1px solid var(--border)', background: '#fff',
                        cursor: 'pointer', fontSize: 14, lineHeight: 1,
                      }}>+</button>
                    </div>
                    <div style={{ minWidth: 60, textAlign: 'right', fontWeight: 600 }}>
                      Q{(parseFloat(i.precio) * i.cantidad).toFixed(2)}
                    </div>
                    <button onClick={() => quitarDelCarrito(i.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--rojo)', fontSize: 16,
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {!recibo && <div style={{
              fontSize: 20, fontWeight: 700, textAlign: 'right',
              padding: '12px 0', borderTop: '2px solid var(--border)', marginBottom: 14,
            }}>
              Total: Q{total.toFixed(2)}
            </div>}

            {!recibo && metodo === 'efectivo' && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  PAGO DEL CLIENTE
                </p>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    fontWeight: 700, color: 'var(--text-muted)', fontSize: 15,
                  }}>Q</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="0.00"
                    value={pagaCon}
                    onChange={e => setPagaCon(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 10px 9px 24px', fontSize: 16,
                      border: '1px solid var(--border)', borderRadius: 8,
                      boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>
                {vuelto !== null && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8, textAlign: 'right',
                    fontSize: 16, fontWeight: 700,
                    background: vuelto >= 0 ? '#e6f9ed' : '#fde8e8',
                    color:      vuelto >= 0 ? '#1a7f3c' : 'var(--rojo)',
                    border:     vuelto >= 0 ? '1px solid #a3d9b1' : '1px solid #f5a0a0',
                  }}>
                    {vuelto >= 0
                      ? `Vuelto: Q${vuelto.toFixed(2)}`
                      : `Falta: Q${Math.abs(vuelto).toFixed(2)}`}
                  </div>
                )}
              </div>
            )}

            {!recibo && <>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                MÉTODO DE PAGO
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {METODOS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => { setMetodo(m.value); if (m.value !== 'efectivo') setPagaCon('') }}
                    style={{
                      flex: 1, padding: '9px 4px', fontSize: 12, cursor: 'pointer',
                      borderRadius: 8, textAlign: 'center',
                      fontWeight: metodo === m.value ? 700 : 400,
                      border:     metodo === m.value ? '2px solid var(--azul)' : '1px solid var(--border)',
                      background: metodo === m.value ? 'var(--azul-claro)' : '#fff',
                      color:      metodo === m.value ? 'var(--azul)' : 'var(--text-muted)',
                    }}
                  >
                    <div style={{ fontSize: 18 }}>{m.icon}</div>
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-success w-full"
                style={{ padding: '13px', fontSize: 15 }}
                onClick={cobrar}
                disabled={cobrando || carrito.length === 0}
              >
                {cobrando ? 'Procesando...' : `Cobrar Q${total.toFixed(2)}`}
              </button>

            </>}
          </div>
        </div>
      </div>

    </>
  )
}