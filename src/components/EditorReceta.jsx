import { useEffect, useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function EditorReceta({ productoId }) {
  const [ingredientesDisp, setIngredientesDisp] = useState([])
  const [receta, setReceta]                     = useState([])
  const [selecId, setSelecId]                   = useState('')
  const [cantidad, setCantidad]                 = useState('')
  const [guardando, setGuardando]               = useState(false)

  useEffect(() => {
    api.get('/productos').then(r =>
      setIngredientesDisp(r.data.filter(p => p.id !== productoId && p.tipo === 'simple'))
    )
    api.get(`/recetas/${productoId}`).then(r => setReceta(r.data))
  }, [productoId])

  const agregarIngrediente = () => {
    if (!selecId || !cantidad || parseFloat(cantidad) <= 0) return
    const ing = ingredientesDisp.find(p => p.id === parseInt(selecId))
    if (!ing) return
    if (receta.find(r => r.ingrediente_id === ing.id)) {
      toast.error('Ese ingrediente ya está en la receta'); return
    }
    setReceta(prev => [...prev, {
      ingrediente_id:     ing.id,
      ingrediente:        ing.nombre,
      unidad_ingrediente: ing.unidad,
      stock_actual:       ing.stock,
      cantidad:           parseFloat(cantidad),
    }])
    setSelecId(''); setCantidad('')
  }

  const quitarIngrediente = (id) =>
    setReceta(r => r.filter(x => x.ingrediente_id !== id))

  const actualizarCantidad = (id, val) =>
    setReceta(prev => prev.map(x =>
      x.ingrediente_id === id ? { ...x, cantidad: parseFloat(val) || 0 } : x
    ))

  const guardarReceta = async () => {
    if (receta.length === 0) { toast.error('Agrega al menos un ingrediente'); return }
    setGuardando(true)
    try {
      await api.put(`/recetas/${productoId}`, {
        ingredientes: receta.map(r => ({
          ingrediente_id: r.ingrediente_id,
          cantidad:       r.cantidad,
        })),
      })
      toast.success('Receta guardada correctamente')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarReceta = async () => {
    if (!confirm('¿Eliminar la receta? El producto pasará a ser simple.')) return
    await api.delete(`/recetas/${productoId}`)
    setReceta([])
    toast.success('Receta eliminada')
  }

  const disponiblesNoEnReceta = ingredientesDisp.filter(
    p => !receta.find(r => r.ingrediente_id === p.id)
  )

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>Ingredientes de la receta</strong>
        {receta.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={eliminarReceta}>
            Eliminar receta
          </button>
        )}
      </div>

      {receta.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Stock actual</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {receta.map(r => (
                  <tr key={r.ingrediente_id}>
                    <td>{r.ingrediente}</td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 90 }}
                        value={r.cantidad}
                        min="0.001"
                        step="0.001"
                        onChange={e => actualizarCantidad(r.ingrediente_id, e.target.value)}
                      />
                    </td>
                    <td className="text-muted">{r.unidad_ingrediente}</td>
                    <td style={{
                      color: parseFloat(r.stock_actual) < r.cantidad ? 'var(--rojo)' : 'var(--verde)'
                    }}>
                      {r.stock_actual} {r.unidad_ingrediente}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => quitarIngrediente(r.ingrediente_id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select
          className="form-control"
          style={{ flex: 2, minWidth: 180 }}
          value={selecId}
          onChange={e => setSelecId(e.target.value)}
        >
          <option value="">Seleccionar ingrediente...</option>
          {disponiblesNoEnReceta.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre} — stock: {p.stock} {p.unidad}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="form-control"
          style={{ width: 110 }}
          placeholder="Cantidad"
          value={cantidad}
          min="0.001"
          step="0.001"
          onChange={e => setCantidad(e.target.value)}
        />
        <button className="btn btn-outline" onClick={agregarIngrediente}>
          + Agregar
        </button>
      </div>

      <button
        className="btn btn-primary"
        onClick={guardarReceta}
        disabled={guardando || receta.length === 0}
      >
        {guardando ? 'Guardando...' : 'Guardar receta'}
      </button>
    </div>
  )
}