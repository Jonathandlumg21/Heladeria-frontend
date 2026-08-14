import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ModalFEL({ ventaId, onClose }) {
  const [nit, setNit]             = useState('')
  const [nombre, setNombre]       = useState('')
  const [cargando, setCargando]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError]         = useState(null)
  const [cargandoPdf, setCargandoPdf] = useState(false)

  const generarFEL = async () => {
    setCargando(true)
    setError(null)
    try {
      const { data } = await api.post(`/fel/facturar/${ventaId}`, {
        nit_receptor:    nit.trim() || null,
        nombre_receptor: nombre.trim() || null,
      })
      setResultado(data)
      toast.success('¡Factura FEL certificada ante la SAT!')
    } catch (e) {
      const msg = e.response?.data?.error || 'Error al generar factura'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      toast.error('Error al generar la factura')
    } finally {
      setCargando(false)
    }
  }

  const verPdf = async () => {
    setCargandoPdf(true)
    try {
      const res = await api.get(`/fel/pdf/${ventaId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      window.open(url, '_blank')
    } catch {
      toast.error('No se pudo obtener el PDF de la factura')
    } finally {
      setCargandoPdf(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📄 Generar Factura FEL</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Resultado exitoso */}
          {resultado && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Factura certificada ante la SAT
              </p>
              <div style={{
                background: 'var(--bg)', borderRadius: 8, padding: 14,
                marginBottom: 16, textAlign: 'left', fontSize: 13,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>UUID SAT:</span>
                  <span style={{ fontWeight: 600, fontSize: 11 }}>{resultado.uuid_sat}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>No. DTE:</span>
                  <span style={{ fontWeight: 600 }}>{resultado.numero_dte}</span>
                </div>
              </div>
              <button
                className="btn btn-primary w-full"
                style={{ marginBottom: 8, padding: 12 }}
                onClick={verPdf}
                disabled={cargandoPdf}
              >
                {cargandoPdf ? 'Cargando PDF...' : '📥 Ver PDF de la factura'}
              </button>
              <button className="btn btn-outline w-full" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}

          {/* Error */}
          {error && !resultado && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5',
              borderRadius: 8, padding: 14, marginBottom: 16,
              fontSize: 13, color: 'var(--rojo)',
            }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>❌ Error al certificar</p>
              <p>{error}</p>
            </div>
          )}

          {/* Formulario */}
          {!resultado && (
            <>
              <div style={{
                background: '#eef4ff', borderRadius: 8, padding: 12,
                marginBottom: 16, fontSize: 13, color: 'var(--azul)',
              }}>
                ℹ️ Si el cliente no tiene NIT la factura se emite como <strong>Consumidor Final</strong> automáticamente.
              </div>

              <div className="form-group">
                <label className="form-label">NIT del cliente (opcional)</label>
                <input
                  className="form-control"
                  placeholder="Ej: 12345678 o CF"
                  value={nit}
                  onChange={e => setNit(e.target.value)}
                  disabled={cargando}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del cliente (opcional)</label>
                <input
                  className="form-control"
                  placeholder="Consumidor Final"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  disabled={cargando}
                />
              </div>

              {cargando && (
                <div style={{
                  textAlign: 'center', padding: '16px 0',
                  color: 'var(--text-muted)', fontSize: 13,
                }}>
                  <div className="spinner" style={{ margin: '0 auto 8px' }}/>
                  Certificando factura ante la SAT...
                </div>
              )}
            </>
          )}
        </div>

        {!resultado && (
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose} disabled={cargando}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={generarFEL}
              disabled={cargando}
            >
              {cargando ? 'Certificando...' : '📄 Generar Factura FEL'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}