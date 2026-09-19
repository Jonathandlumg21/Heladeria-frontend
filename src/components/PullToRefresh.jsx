import { useEffect, useRef, useState } from 'react'

const UMBRAL      = 55   // px de indicador a partir de los cuales se actualiza al soltar
const MAXIMO      = 110  // px máximos que baja el indicador
const RESISTENCIA = 0.5  // el indicador se mueve la mitad de lo que se arrastra el dedo

// Un toque que empieza dentro de un elemento con scroll propio (tabla, lista) que ya
// no está arriba es un scroll normal, no un "jalar para actualizar".
const enScrollInterno = (el) => {
  while (el && el !== document.body) {
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true
    el = el.parentElement
  }
  return false
}

export default function PullToRefresh() {
  const [distancia, setDistancia]       = useState(0)
  const [actualizando, setActualizando] = useState(false)
  const inicio = useRef(null)
  const dist   = useRef(0)

  useEffect(() => {
    const reiniciar = () => {
      inicio.current = null
      dist.current   = 0
      setDistancia(0)
    }

    const onStart = (e) => {
      if (e.touches.length !== 1 || window.scrollY > 0) return
      // No interferir con modales, menú lateral ni scrolls internos
      if (e.target.closest?.('.modal-overlay, .sidebar') || enScrollInterno(e.target)) return
      inicio.current = e.touches[0].clientY
    }

    const onMove = (e) => {
      if (inicio.current === null) return
      const dy = e.touches[0].clientY - inicio.current
      if (dy <= 0 || window.scrollY > 0) { reiniciar(); return }
      dist.current = Math.min(dy * RESISTENCIA, MAXIMO)
      setDistancia(dist.current)
    }

    const onEnd = () => {
      if (inicio.current === null) return
      const listo = dist.current >= UMBRAL
      inicio.current = null
      if (!listo) { reiniciar(); return }
      setActualizando(true)
      setDistancia(UMBRAL)
      setTimeout(() => window.location.reload(), 250)
    }

    document.addEventListener('touchstart',  onStart,    { passive: true })
    document.addEventListener('touchmove',   onMove,     { passive: true })
    document.addEventListener('touchend',    onEnd,      { passive: true })
    document.addEventListener('touchcancel', reiniciar,  { passive: true })
    return () => {
      document.removeEventListener('touchstart',  onStart)
      document.removeEventListener('touchmove',   onMove)
      document.removeEventListener('touchend',    onEnd)
      document.removeEventListener('touchcancel', reiniciar)
    }
  }, [])

  if (distancia === 0 && !actualizando) return null

  return (
    <div
      className="ptr"
      style={{
        transform:  `translateY(${distancia - 55}px)`,
        opacity:    Math.min(1, distancia / UMBRAL),
        transition: actualizando ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
      }}
    >
      {actualizando
        ? <span className="spinner"/>
        : <span style={{
            display: 'inline-block', transition: 'transform 0.2s',
            transform: distancia >= UMBRAL ? 'rotate(180deg)' : 'none',
          }}>↓</span>}
    </div>
  )
}
