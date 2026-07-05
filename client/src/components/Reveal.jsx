import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/* Scroll reveal — opacity 0 + y30 → in, 600ms ease-out, optional stagger index */
export function Reveal({ children, delay = 0, y = 30, style, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/* Count-up that fires when it scrolls into view (handles 1.2M+, 24/7, 4.9★, 88%) */
export function CountUp({ value, duration = 1400 }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(formatStatic(value, 0))
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        animate(value, duration, setDisplay)
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return <span ref={ref}>{display}</span>
}

/* Parse a stat string into {num, prefix, suffix} so we can animate the numeric part */
function parse(value) {
  const m = String(value).match(/^(\D*)([\d.]+)(.*)$/)
  if (!m) return null
  return { prefix: m[1], num: parseFloat(m[2]), suffix: m[3], decimals: (m[2].split('.')[1] || '').length }
}
function formatStatic(value, frac) {
  const p = parse(value)
  if (!p) return value
  return `${p.prefix}${frac.toFixed(p.decimals)}${p.suffix}`
}
function animate(value, duration, set) {
  const p = parse(value)
  if (!p) { set(value); return }
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    const cur = p.num * eased
    set(`${p.prefix}${cur.toFixed(p.decimals)}${p.suffix}`)
    if (t < 1) requestAnimationFrame(tick)
    else set(`${p.prefix}${p.num.toFixed(p.decimals)}${p.suffix}`)
  }
  requestAnimationFrame(tick)
}

/* Minimal line icons for How It Works */
export function Icon({ name, size = 26, color = '#1A1815' }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (name === 'target') return (<svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>)
  if (name === 'scan') return (<svg {...common}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></svg>)
  if (name === 'trend') return (<svg {...common}><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>)
  return null
}
