import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import EditorReceta from '../components/EditorReceta'

const VACÍO = {
  nombre: '', precio: '', stock: '0', stock_minimo: '5',
  unidad: 'unidades', tipo: 'simple', categoria_id: '',
}

const PALETA = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef9c3', color: '#a16207' },
  { bg: '#ede9fe', color: '#6d28d9' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#ccfbf1', color: '#0f766e' },
  { bg: '#e0e7ff', color: '#4338ca' },
  { bg: '#fef2f2', color: '#b91c1c' },
  { bg: '#f0fdf4', color: '#166534' },
  { bg: '#fff7ed', color: '#9a3412' },
  { bg: '#fdf4ff', color: '#7e22ce' },
]

const colorCat = (categoria_id, categorias) => {
  const idx = categorias.findIndex(c => String(c.id) === String(categoria_id))
  return idx >= 0 ? PALETA[idx % PALETA.length] : null
}

export default function Productos() {
  const [productos, setProductos]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(VACÍO)
  const [productoActivo, setProductoActivo] = useState(null)
  const [imagen, setImagen]         = useState(null)
  const [pestaña, setPestaña]       = useState('datos')
  const [busqueda, setBusqueda]     = useState('')
  const [guardando, setGuardando]   = useState(false)

  const cargar = () => {
    api.get('/productos').then(r => setProductos(r.data))
    api.get('/usuarios/categorias').then(r => setCategorias(r.data))
  }

  useEffect(() => { cargar() }, [])

  const abrirCrear = () => {
    setForm(VACÍO); setImagen(null); setPestaña('datos')
    setProductoActivo(null); setModal('crear')
  }

  const abrirEditar = (p) => {
    setForm({
      nombre:       p.nombre,
      precio:       p.precio,
      stock_minimo: p.stock_minimo,
      unidad:       p.unidad,
      tipo:         p.tipo,
      categoria_id: p.categoria_id || '',
    })
    setImagen(null); setPestaña('datos')
    setProductoActivo(p); setModal('editar')
  }

  const guardarProducto = async () => {
    if (!form.nombre || !form.precio) {
      toast.error('Nombre y precio son requeridos'); return
    }
    setGuardando(true)
    try {
      if (modal === 'crear') {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v) })
        if (imagen) fd.append('imagen', imagen)
        const { data: nuevo } = await api.post('/productos', fd)
        toast.success('Producto creado')
        setProductoActivo(nuevo)
        setModal('editar')
        setPestaña(form.tipo === 'compuesto' ? 'receta' : 'datos')
      } else {
        await api.put(`/productos/${productoActivo.id}`, form)
        if (imagen) {
          const fd2 = new FormData()
          fd2.append('imagen', imagen)
          await api.patch(`/productos/${productoActivo.id}/imagen`, fd2)
        }
        toast.success('Producto actualizado')
      }
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const desactivar = async (p) => {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return
    await api.delete(`/productos/${p.id}`)
    toast.success('Producto desactivado')
    cargar()
  }

  const esEspecialidades = categorias.find(c => String(c.id) === String(form.categoria_id))?.nombre?.toLowerCase() === 'especialidades'

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🍦 Productos</h1>
        <button className="btn btn-primary" onClick={abrirCrear}>+ Nuevo producto</button>
      </div>

      <div className="page-content">
        <input
          className="form-control"
          style={{ maxWidth: 320, marginBottom: 16 }}
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Categoría</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
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
                    <td><span className={`badge ${p.tipo === 'compuesto' ? 'badge-admin' : 'badge-ok'}`}>{p.tipo}</span></td>
                    <td>Q{parseFloat(p.precio).toFixed(2)}</td>
                    <td>{p.stock} {p.unidad}</td>
                    <td>
                      {p.categoria ? (() => {
                        const c = colorCat(p.categoria_id, categorias)
                        return c ? (
                          <span style={{
                            display: 'inline-block', fontSize: 12, fontWeight: 600,
                            padding: '3px 10px', borderRadius: 20,
                            background: c.bg, color: c.color,
                          }}>
                            {p.categoria}
                          </span>
                        ) : <span className="text-muted">{p.categoria}</span>
                      })() : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(p)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => desactivar(p)}>Desactivar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ width: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === 'crear' ? 'Nuevo producto' : `Editar: ${productoActivo?.nombre}`}
              </h3>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>

            {modal === 'editar' && productoActivo && (
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
                {[
                  { key: 'datos',  label: 'Datos' },
                  { key: 'imagen', label: 'Imagen' },
                  ...(form.tipo === 'compuesto' || productoActivo?.tipo === 'compuesto'
                    ? [{ key: 'receta', label: 'Receta / ingredientes' }]
                    : []),
                ].map(tab => (
                  <button key={tab.key} onClick={() => setPestaña(tab.key)} style={{
                    padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontWeight: pestaña === tab.key ? 700 : 400,
                    color: pestaña === tab.key ? 'var(--azul)' : 'var(--text-muted)',
                    borderBottom: pestaña === tab.key ? '2px solid var(--azul)' : '2px solid transparent',
                    fontSize: 14,
                  }}>{tab.label}</button>
                ))}
              </div>
            )}

            <div className="modal-body">
              {pestaña === 'datos' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input className="form-control" value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}/>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Precio (Q)</label>
                      <input type="number" className="form-control" min="0" step="0.01"
                        value={form.precio}
                        onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}/>
                    </div>
                    {!esEspecialidades && (
                      <div className="form-group">
                        <label className="form-label">Stock mínimo</label>
                        <input type="number" className="form-control" min="0"
                          value={form.stock_minimo}
                          onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}/>
                      </div>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Unidad</label>
                      <select className="form-control" value={form.unidad}
                        onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                        {['unidades','kg','litros','porciones','cajas','bolsas','gramos','ml'].map(u =>
                          <option key={u} value={u}>{u}</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Categoría</label>
                      <select className="form-control" value={form.categoria_id}
                        onChange={e => {
                          const catId = e.target.value
                          const esEsp = categorias.find(c => String(c.id) === catId)?.nombre?.toLowerCase() === 'especialidades'
                          setForm(f => ({ ...f, categoria_id: catId, ...(esEsp ? { stock: '0', stock_minimo: '0' } : {}) }))
                        }}>
                        <option value="">Sin categoría</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de producto</label>
                    <div style={{ display: 'flex', gap: 20 }}>
                      {[
                        { value: 'simple',    label: '📦 Simple — se vende tal cual' },
                        { value: 'compuesto', label: '🧪 Compuesto — usa ingredientes' },
                      ].map(t => (
                        <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="radio" name="tipo" value={t.value}
                            checked={form.tipo === t.value}
                            onChange={() => setForm(f => ({ ...f, tipo: t.value }))}/>
                          <span style={{ fontSize: 14 }}>{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {modal === 'crear' && !esEspecialidades && form.tipo !== 'compuesto' && (
                    <div className="form-group">
                      <label className="form-label">Stock inicial</label>
                      <input type="number" className="form-control" min="0"
                        value={form.stock}
                        onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}/>
                    </div>
                  )}

                  {form.tipo === 'compuesto' && modal === 'crear' && (
                    <div style={{ background: '#eef4ff', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--azul)' }}>
                      ℹ️ Después de crear el producto podrás definir los ingredientes en la pestaña "Receta".
                    </div>
                  )}
                </>
              )}

              {pestaña === 'imagen' && productoActivo && (
                <div>
                  {productoActivo.imagen_url && (
                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                      <img src={productoActivo.imagen_url} alt=""
                        style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover' }}/>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Imagen actual</p>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Seleccionar nueva imagen</label>
                    <input type="file" className="form-control" accept="image/*"
                      onChange={e => setImagen(e.target.files[0])}/>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      JPG, PNG o WebP — máximo 5MB
                    </p>
                  </div>
                  {imagen && (
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <img src={URL.createObjectURL(imagen)} alt="preview"
                        style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, objectFit: 'cover' }}/>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Vista previa</p>
                    </div>
                  )}
                </div>
              )}

              {pestaña === 'receta' && productoActivo && (
                <EditorReceta productoId={productoActivo.id} />
              )}
            </div>

            {pestaña !== 'receta' && (
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={guardarProducto} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}