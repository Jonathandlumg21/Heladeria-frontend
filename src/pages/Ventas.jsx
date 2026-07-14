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

  // ── Impresión via diálogo nativo de Android ──
  const imprimirTicket = (ventaId, totalVenta, metodoUsado, itemsVendidos, pagoCliente) => {
    const fecha = new Date().toLocaleString('es', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    const filas = itemsVendidos.map(i => `
      <tr>
        <td style="padding:2px 0">${i.nombre}</td>
        <td style="text-align:right;padding:2px 0;white-space:nowrap">Q${(parseFloat(i.precio) * i.cantidad).toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="2" style="color:#555;font-size:10px;padding-bottom:4px">
          &nbsp;&nbsp;x${i.cantidad} a Q${parseFloat(i.precio).toFixed(2)} c/u
        </td>
      </tr>
    `).join('')

    const vueltoHtml = metodoUsado === 'efectivo' && pagoCliente > 0 ? `
      <tr><td>Entrega</td><td style="text-align:right">Q${pagoCliente.toFixed(2)}</td></tr>
      <tr><td><b>Vuelto</b></td><td style="text-align:right"><b>Q${(pagoCliente - parseFloat(totalVenta)).toFixed(2)}</b></td></tr>
    ` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      @page { size: 80mm auto; margin: 3mm; }
      * { box-sizing: border-box; }
      body { font-family: monospace; font-size: 12px; width: 74mm; margin: 0; }
      .centro { text-align: center; }
      .titulo { font-size: 18px; font-weight: bold; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; }
      .total-row td { font-size: 14px; font-weight: bold; padding-top: 4px; }
    </style></head><body>
      <div class="centro titulo">HELADERIA</div>
      <hr>
      <div>Fecha: ${fecha}</div>
      <div>Ticket #${ventaId}</div>
      <hr>
      <table>${filas}</table>
      <hr>
      <table>
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align:right">Q${totalVenta}</td>
        </tr>
        ${vueltoHtml}
        <tr><td style="padding-top:4px">Pago</td><td style="text-align:right;padding-top:4px">${METODO_LABEL[metodoUsado]}</td></tr>
      </table>
      <hr>
      <div class="centro"><b>Gracias por su compra!</b></div>
    </body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
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
    <div>
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

            {carrito.length === 0 ? (
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

            <div style={{
              fontSize: 20, fontWeight: 700, textAlign: 'right',
              padding: '12px 0', borderTop: '2px solid var(--border)', marginBottom: 14,
            }}>
              Total: Q{total.toFixed(2)}
            </div>

            {metodo === 'efectivo' && (
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

            {carrito.length > 0 && (
              <button
                className="btn btn-outline w-full"
                style={{ marginTop: 8 }}
                onClick={() => setCarrito([])}
              >
                Limpiar carrito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}