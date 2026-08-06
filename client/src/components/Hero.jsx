import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { C, F } from '../theme'
import StackdLogo from './StackdLogo'

// The single subtle bit of motion: the profit gently counts up once.
function useCountUp(to, duration = 1200, delay = 500) {
  const [v, setV] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    let start
    const timer = setTimeout(() => {
      const tick = (now) => {
        if (!start) start = now
        const p = Math.min((now - start) / duration, 1)
        setV(Math.round((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(timer); if (raf.current) cancelAnimationFrame(raf.current) }
  }, [to, duration, delay])
  return v
}

const ease = [0.16, 1, 0.3, 1]

export default function Hero({ onStartFlipping }) {
  const profit = useCountUp(182)

  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: C.bg }}>
      {/* one soft, quiet gold glow — the only background flourish */}
      <div aria-hidden style={{
        position: 'absolute', top: '-30%', right: '5%', width: 560, height: 560, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,180,41,0.07), transparent 65%)', pointerEvents: 'none',
      }} />

      <div className="hero-grid" style={{
        position: 'relative', maxWidth: 1120, margin: '0 auto',
        padding: 'clamp(80px,12vw,150px) 24px', display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr', gap: 64, alignItems: 'center',
      }}>
        {/* ── LEFT: copy ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
            <StackdLogo size={18} />
            <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.text3 }}>
              Resale, done right
            </span>
          </div>

          <h1 style={{ margin: 0, lineHeight: 1.06, letterSpacing: '-0.025em' }}>
            <span style={{ display: 'block', fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(36px,5.6vw,60px)', color: C.text }}>Turn resale into</span>
            <span style={{ display: 'block', fontFamily: F.display, fontWeight: 600, fontSize: 'clamp(36px,5.6vw,60px)', color: C.text }}>real <span style={{ color: C.accent }}>money.</span></span>
          </h1>

          <p style={{ fontFamily: F.display, fontWeight: 400, fontSize: 'clamp(15px,1.4vw,18px)', color: C.text2, lineHeight: 1.65, maxWidth: 430, marginTop: 22 }}>
            Stackd finds items you can buy low and sell high — with real listings, verified sold prices, and the exact profit. Start with what you know.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 34, flexWrap: 'wrap' }}>
            <button onClick={onStartFlipping}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 9, height: 50, padding: '0 24px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: F.display, fontWeight: 600, fontSize: 15, background: C.accent, color: C.bg, transition: 'filter 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
              Start flipping <ArrowRight size={17} />
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F.display, fontWeight: 500, fontSize: 15, color: C.text2, transition: 'color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.color = C.text2 }}>
              How it works →
            </button>
          </div>

          <p style={{ fontFamily: F.display, fontSize: 12.5, color: C.text3, marginTop: 40, letterSpacing: '0.01em' }}>
            Real listings · Verified sold prices · No fakes
          </p>
        </motion.div>

        {/* ── RIGHT: one quiet focal flip card ── */}
        <motion.div className="hero-card" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease }}>
          <div style={{
            position: 'relative', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`,
            borderRadius: 18, padding: 26, boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StackdLogo size={16} />
                <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: '0.1em', color: C.text3 }}>FLIP · 001</span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: F.display, fontSize: 11, fontWeight: 500, color: C.accent, background: C.accentBg, borderRadius: 999, padding: '4px 10px' }}>
                <ShieldCheck size={12} /> Verified
              </span>
            </div>

            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 17, color: C.text }}>Air Jordan 1 Retro Chicago</div>
            <div style={{ fontFamily: F.display, fontSize: 12, color: C.text3, marginTop: 3, marginBottom: 26 }}>Sneakers · 12 real sold comps</div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontFamily: F.display, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text3, marginBottom: 5 }}>Buy</div>
                <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: C.text, lineHeight: 1 }}>$128</div>
              </div>
              <ArrowRight size={18} color={C.text3} style={{ marginBottom: 5 }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: F.display, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text3, marginBottom: 5 }}>Sell</div>
                <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: C.text, lineHeight: 1 }}>$310</div>
              </div>
            </div>

            <div style={{ height: 1, background: C.panelBorder, margin: '22px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: F.display, fontSize: 13, color: C.text2 }}>Net profit</span>
              <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 20, color: C.accent }}>+${profit}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
