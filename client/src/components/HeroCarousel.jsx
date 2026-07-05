import { useState, useEffect, useRef, useMemo } from 'react'
import { CheckCircle, Flame, Cpu, DollarSign, Users, TrendingUp } from 'lucide-react'
import { C, F } from '../theme'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function useScramble(target, duration = 650) {
  const [out, setOut] = useState(target)
  useEffect(() => {
    const str = String(target)
    const total = Math.max(1, Math.ceil(duration / 40))
    let frame = 0
    const id = setInterval(() => {
      frame++
      if (frame >= total) { setOut(str); clearInterval(id); return }
      const revealed = Math.floor((frame / total) * str.length)
      let s = ''
      for (let i = 0; i < str.length; i++) {
        const ch = str[i]
        s += (i < revealed || ch === ' ' || ch === '$' || ch === '+' || ch === '%') ? ch : CHARS[(Math.random() * CHARS.length) | 0]
      }
      setOut(s)
    }, 40)
    return () => clearInterval(id)
  }, [target, duration])
  return out
}

function ParticleBurst({ seed, count = 8, color = C.accent }) {
  const [parts, setParts] = useState([])
  useEffect(() => {
    if (seed == null) return
    const p = Array.from({ length: count }, (_, i) => {
      const ang = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 30
      return { id: `${seed}-${i}`, tx: `${Math.cos(ang) * dist}px`, ty: `${Math.sin(ang) * dist}px` }
    })
    setParts(p)
    const t = setTimeout(() => setParts([]), 650)
    return () => clearTimeout(t)
  }, [seed, count, color])
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {parts.map((pt) => (
        <span key={pt.id} style={{ position: 'absolute', left: '50%', top: '50%', width: 3, height: 3, borderRadius: '50%', background: color, '--tx': pt.tx, '--ty': pt.ty, animation: 'particle-fly 0.6s ease-out forwards' }} />
      ))}
    </div>
  )
}

function useCountUp(target, run, duration = 1500) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (!run) return
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [target, run, duration])
  return val
}

function useTypewriter(full, startDelay = 0, speed = 70) {
  const [out, setOut] = useState('')
  useEffect(() => {
    let i = 0
    let id
    const start = setTimeout(() => {
      id = setInterval(() => {
        i++
        setOut(full.slice(0, i))
        if (i >= full.length) clearInterval(id)
      }, speed)
    }, startDelay)
    return () => { clearTimeout(start); clearInterval(id) }
  }, [full, startDelay, speed])
  return out
}

// ══════════════ PANEL 1 — VERIFIED FLIP ══════════════
const VERIFIED_FLIPS = [
  { item: 'Nike Dunk Low Panda', bought: 89, sold: 162, profit: 73, roi: 82, from: 'eBay', to: 'StockX', days: 3 },
  { item: 'Jordan 4 Bred Reimagined', bought: 185, sold: 310, profit: 125, roi: 68, from: 'eBay', to: 'GOAT', days: 5 },
  { item: 'Supreme Box Logo FW24', bought: 145, sold: 258, profit: 113, roi: 78, from: 'Depop', to: 'Grailed', days: 7 },
]
function PanelVerifiedFlip() {
  const [idx, setIdx] = useState(0)
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    const t = setInterval(() => { setIdx(i => (i + 1) % VERIFIED_FLIPS.length); setBurst(b => b + 1) }, 4000)
    return () => clearInterval(t)
  }, [])
  const f = VERIFIED_FLIPS[idx]
  const profitVal = useScramble(`+$${f.profit}`)
  const roiVal = useScramble(`${f.roi}%`)
  return (
    <PanelBody>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Verified Flip</span>
        </div>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{f.days}d ago</span>
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 16, lineHeight: 1.3 }}>{f.item}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Bought · {f.from}</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.55)' }}>${f.bought}</div>
        </div>
        <div style={{ fontSize: 16, color: C.accent }}>→</div>
        <div style={{ background: 'rgba(240,180,41,0.07)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(240,180,41,0.18)' }}>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 9, color: C.accentDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Sold · {f.to}</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 18, color: C.text }}>${f.sold}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 34, color: C.accent, lineHeight: 1 }}>{profitVal}</div>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>profit</div>
          <ParticleBurst seed={burst} count={8} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: '#4ADE80', lineHeight: 1 }}>{roiVal}</div>
          <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>ROI</div>
        </div>
      </div>
    </PanelBody>
  )
}

// ══════════════ PANEL 2 — MARKET HEAT ══════════════
const HEAT_ITEMS = [
  { name: 'Jordan 4 Bred Reimag.', heat: 94, delta: '+34%' },
  { name: 'Pokémon 151 Sealed Box', heat: 89, delta: '+41%' },
  { name: 'Supreme Box Logo FW24', heat: 82, delta: '+28%' },
  { name: 'Nike SB Dunk Low Pro', heat: 74, delta: '+19%' },
]
function PanelHeatmap() {
  const [heats, setHeats] = useState(HEAT_ITEMS)
  useEffect(() => {
    const t = setInterval(() => {
      setHeats(prev => prev.map(item => ({
        ...item,
        heat: Math.min(99, item.heat + (Math.random() > 0.55 ? 1 : 0)),
      })))
    }, 3200)
    return () => clearInterval(t)
  }, [])
  return (
    <PanelBody>
      <PanelHeader label="🔥 Market Heat" labelColor={C.accent} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
        {heats.map((item, i) => (
          <div key={item.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 12, color: C.text }}>{item.name}</span>
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.accent, fontWeight: 700 }}>{item.delta}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${item.heat}%`,
                background: `linear-gradient(90deg, rgba(240,180,41,0.4), ${C.accent})`,
                borderRadius: 999,
                transition: 'width 800ms ease',
              }} />
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>Heat score {item.heat}</div>
          </div>
        ))}
      </div>
    </PanelBody>
  )
}

// ══════════════ PANEL 3 — AI FLIP SCORE ══════════════
const FLIP_PICKS = [
  { name: 'Nike Dunk Low Panda', score: 96, category: 'Sneakers', buy: 89, sell: 162 },
  { name: 'Jordan 4 Bred Reimag.', score: 93, category: 'Sneakers', buy: 185, sell: 310 },
  { name: 'Pokémon 151 Sealed', score: 88, category: 'Cards', buy: 65, sell: 140 },
]
function PanelFlipScore() {
  const [idx, setIdx] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    const t = setInterval(() => { setIdx(i => (i + 1) % FLIP_PICKS.length); setAnimKey(k => k + 1) }, 5000)
    return () => clearInterval(t)
  }, [])
  const pick = FLIP_PICKS[idx]
  const scoreVal = useScramble(String(pick.score), 600)
  const R = 40, CX = 44, strokeW = 5
  const circ = 2 * Math.PI * R
  const dash = (pick.score / 100) * circ
  return (
    <PanelBody>
      <PanelHeader label="🤖 AI Flip Score" labelColor={C.accent} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={CX * 2} height={CX * 2} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeW} />
            <circle key={animKey} cx={CX} cy={CX} r={R} fill="none" stroke={C.accent} strokeWidth={strokeW}
              strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 22, color: C.accent }}>{scoreVal}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13, color: C.text, lineHeight: 1.3, marginBottom: 6 }}>{pick.name}</div>
          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 9, color: C.accent, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{pick.category}</span>
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontFamily: F.display, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Buy</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>${pick.buy}</div>
        </div>
        <span style={{ color: C.accent, fontSize: 14 }}>→</span>
        <div style={{ background: 'rgba(240,180,41,0.07)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(240,180,41,0.15)', textAlign: 'right' }}>
          <div style={{ fontFamily: F.display, fontSize: 9, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Sell</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 16, color: C.text }}>${pick.sell}</div>
        </div>
      </div>
      <ConfidenceBar value={pick.score} trigger={animKey} />
    </PanelBody>
  )
}

// ══════════════ PANEL 4 — FRESH DEAL ══════════════
const FRESH_DEALS = [
  { item: 'Nike Dunk Low Panda', tag: 'SIZE 10', buy: 89, sell: 162, profit: 73, from: 'eBay', to: 'StockX' },
  { item: 'Jordan 4 Bred Reimag.', tag: 'DS', buy: 185, sell: 310, profit: 125, from: 'eBay', to: 'GOAT' },
  { item: 'Air Force 1 Triple White', tag: 'SIZE 11', buy: 65, sell: 120, profit: 55, from: 'Marketplace', to: 'eBay' },
]
function PanelDeal() {
  const [idx, setIdx] = useState(0)
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    const t = setInterval(() => { setIdx(i => (i + 1) % FRESH_DEALS.length); setBurst(b => b + 1) }, 5000)
    return () => clearInterval(t)
  }, [])
  const d = FRESH_DEALS[idx]
  const profitVal = useScramble(`+$${d.profit}`)
  return (
    <PanelBody>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent, boxShadow: `0 0 8px ${C.accent}`, animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Fresh Deal</span>
        </div>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 9, color: C.accent, background: 'rgba(240,180,41,0.1)', borderRadius: 4, padding: '2px 8px', border: '1px solid rgba(240,180,41,0.2)', letterSpacing: '0.1em' }}>{d.tag}</span>
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, color: C.text, lineHeight: 1.2, marginBottom: 14 }}>{d.item}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '3px 10px' }}>{d.from}</span>
        <span style={{ color: C.accent, fontSize: 12 }}>→</span>
        <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, color: C.accent, background: 'rgba(240,180,41,0.08)', borderRadius: 6, padding: '3px 10px', border: '1px solid rgba(240,180,41,0.2)' }}>{d.to}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px' }}>
          <div style={{ fontFamily: F.display, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Buy</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.55)' }}>${d.buy}</div>
        </div>
        <div style={{ background: 'rgba(240,180,41,0.07)', borderRadius: 10, padding: '10px', border: '1px solid rgba(240,180,41,0.15)' }}>
          <div style={{ fontFamily: F.display, fontSize: 9, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Sell</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.text }}>${d.sell}</div>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 36, color: C.accent }}>{profitVal}</div>
        <ParticleBurst seed={burst} count={8} />
      </div>
    </PanelBody>
  )
}

// ══════════════ PANEL 5 — COMMUNITY WINS ══════════════
const WINS = [
  { initials: 'JL', item: 'Nike Dunk Low', profit: 145, time: '12m' },
  { initials: 'AM', item: 'Supreme Box Logo', profit: 95, time: '34m' },
  { initials: 'KT', item: 'Jordan 4 Bred', profit: 210, time: '1h' },
  { initials: 'RS', item: 'PS5 Controller', profit: 65, time: '2h' },
]
function PanelCommunity() {
  const [total, setTotal] = useState(18420)
  const [highlight, setHighlight] = useState(-1)
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % WINS.length
      setHighlight(i)
      setTotal(prev => prev + WINS[i].profit)
      setTimeout(() => setHighlight(-1), 1200)
    }, 3500)
    return () => clearInterval(t)
  }, [])
  const totalStr = useScramble(`$${total.toLocaleString()}`)
  return (
    <PanelBody>
      <PanelHeader dot="#4ADE80" label="Community Wins" />
      <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(74,222,128,0.05)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.12)' }}>
        <div style={{ fontFamily: F.display, fontSize: 9, color: 'rgba(74,222,128,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Made today</div>
        <div style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 24, color: '#4ADE80' }}>{totalStr}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {WINS.map((w, i) => (
          <div key={w.initials} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
            background: highlight === i ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${highlight === i ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 350ms ease',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(240,180,41,0.12)', border: '1.5px solid rgba(240,180,41,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 10, color: C.accent }}>{w.initials}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.item}</div>
              <div style={{ fontFamily: F.display, fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{w.time} ago</div>
            </div>
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 13, color: '#4ADE80', flexShrink: 0 }}>+${w.profit}</div>
          </div>
        ))}
      </div>
    </PanelBody>
  )
}

// ══════════════ PANEL 6 — MARKET SIGNAL ══════════════
const SIGNALS = [
  { item: 'Air Jordan 4 Bred', prices: [180, 192, 188, 205, 198, 215, 224, 218, 230, 242], signal: 'BUY', change: '+34%', buy: 196, sell: 262 },
  { item: 'Nike SB Dunk Low', prices: [95, 98, 92, 105, 110, 108, 118, 122, 115, 128], signal: 'BUY', change: '+35%', buy: 89, sell: 120 },
  { item: 'Supreme Camp Cap FW24', prices: [55, 58, 52, 65, 70, 68, 75, 78, 80, 85], signal: 'HOT', change: '+55%', buy: 55, sell: 85 },
]
function Sparkline({ prices }) {
  const min = Math.min(...prices), max = Math.max(...prices)
  const W = 240, H = 50
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / (max - min || 1)) * H}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={area} fill="url(#spark-fill)" stroke="none" />
      <polyline points={pts} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function PanelSignal() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % SIGNALS.length), 6000)
    return () => clearInterval(t)
  }, [])
  const s = SIGNALS[idx]
  return (
    <PanelBody>
      <PanelHeader label="📊 Market Signal" labelColor={C.accent} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: C.text }}>{s.item}</div>
          <div style={{ fontFamily: F.display, fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Last 30 days</div>
        </div>
        <div style={{
          fontFamily: F.display, fontWeight: 800, fontSize: 10,
          color: s.signal === 'BUY' ? '#4ADE80' : C.accent,
          background: s.signal === 'BUY' ? 'rgba(74,222,128,0.1)' : 'rgba(240,180,41,0.1)',
          border: `1px solid ${s.signal === 'BUY' ? 'rgba(74,222,128,0.3)' : 'rgba(240,180,41,0.3)'}`,
          borderRadius: 6, padding: '4px 10px', letterSpacing: '0.12em',
        }}>{s.signal}</div>
      </div>
      <Sparkline prices={s.prices} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div>
          <div style={{ fontFamily: F.display, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Buy at</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 17, color: 'rgba(255,255,255,0.6)' }}>${s.buy}</div>
        </div>
        <div style={{ fontSize: 14, color: C.accent }}>→</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.display, fontSize: 9, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Sell at</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 17, color: C.text }}>${s.sell}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.display, fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>30d</div>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 17, color: C.accent }}>{s.change}</div>
        </div>
      </div>
    </PanelBody>
  )
}

// ── shared panel chrome ───────────────────────────────────────────
function PanelHeader({ dot, label, labelColor = 'rgba(255,255,255,0.5)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 8px ${dot}`, animation: 'pulse-dot 1.5s ease-in-out infinite' }} />}
      <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 10, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</span>
    </div>
  )
}
function PanelBody({ children }) {
  return <div style={{ position: 'relative', padding: 18, height: '100%', overflow: 'hidden' }}>{children}</div>
}
function ConfidenceBar({ value, trigger }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confidence</span>
        <span style={{ fontFamily: F.mono, fontSize: 12, color: C.accent }}>{value}%</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: C.accent, borderRadius: 999, transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)' }} />
        <div key={trigger} style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', animation: 'bar-sweep 0.4s ease-out' }} />
      </div>
    </div>
  )
}

// ── Animated orb + blob (code-based 3D glow) ─────────────────────
function OrbBlob() {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, height: 560, zIndex: 2, pointerEvents: 'none' }}>
      {/* Outer atmospheric halo */}
      <div style={{ position: 'absolute', inset: -60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,180,41,0.07) 0%, rgba(240,160,30,0.03) 40%, transparent 70%)', filter: 'blur(50px)', animation: 'orb-pulse 5s ease-in-out infinite' }} />
      {/* Morphing blob layer */}
      <div style={{ position: 'absolute', inset: '8%', background: 'radial-gradient(circle at 42% 38%, rgba(240,180,41,0.11) 0%, rgba(220,140,20,0.05) 50%, transparent 70%)', filter: 'blur(35px)', animation: 'blob-morph 10s ease-in-out infinite' }} />
      {/* Cool grey contrast blob */}
      <div style={{ position: 'absolute', inset: '20%', background: 'radial-gradient(circle at 58% 62%, rgba(200,210,230,0.04) 0%, transparent 60%)', filter: 'blur(40px)', animation: 'blob-morph 13s ease-in-out infinite reverse' }} />
      {/* Inner gold core */}
      <div style={{ position: 'absolute', inset: '35%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,180,41,0.18) 0%, rgba(240,180,41,0.06) 50%, transparent 70%)', filter: 'blur(20px)', animation: 'orb-pulse 3.5s ease-in-out infinite alternate' }} />
      {/* STACKD 3D wordmark */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: F.display, fontWeight: 900,
        fontSize: 72, letterSpacing: '0.25em',
        background: 'linear-gradient(180deg, rgba(240,180,41,0.22) 0%, rgba(240,180,41,0.05) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        transform: 'perspective(600px) rotateX(12deg)',
        filter: 'drop-shadow(0 12px 40px rgba(240,180,41,0.2))',
        userSelect: 'none',
        animation: 'fade-in 0.8s 0.4s both',
      }}>STACKD</div>
    </div>
  )
}

const PANELS = [
  { Comp: PanelVerifiedFlip, Icon: CheckCircle },
  { Comp: PanelHeatmap,      Icon: Flame },
  { Comp: PanelFlipScore,    Icon: Cpu },
  { Comp: PanelDeal,         Icon: DollarSign },
  { Comp: PanelCommunity,    Icon: Users },
  { Comp: PanelSignal,       Icon: TrendingUp },
]
const N = PANELS.length
const RADIUS = 340

function baseTransform(i) {
  return `rotateY(${(i / N) * 360}deg) translateZ(${RADIUS}px)`
}

const HEADLINE = 'Find your next flip.'
const DATA_SNIPPETS = ['+$85', '+$165', '+$310', '92%', '↑23%', '$450', '+$95', '88%', '+$420']

function DataParticles() {
  const parts = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i,
    text: DATA_SNIPPETS[(Math.random() * DATA_SNIPPETS.length) | 0],
    left: `${10 + Math.random() * 80}%`,
    dur: `${14 + Math.random() * 10}s`,
    delay: `${Math.random() * 15}s`,
    opacity: (0.1 + Math.random() * 0.18).toFixed(2),
  })), [])
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden', animation: 'fade-in 0.5s 2.2s both' }}>
      {parts.map((p) => (
        <span key={p.id} style={{ position: 'absolute', left: p.left, bottom: 0, fontFamily: F.mono, fontSize: 10, color: `rgba(240,180,41,${p.opacity})`, animation: `floatUp ${p.dur} linear ${p.delay} infinite`, willChange: 'transform' }}>{p.text}</span>
      ))}
    </div>
  )
}

function dofFilter(z) {
  const blur = z > 100 ? 0 : z > 0 ? 0.5 : z > -100 ? 1.5 : z > -200 ? 3 : 5
  const bri = z > 100 ? 1 : z > 0 ? 0.85 : z > -200 ? 0.65 : 0.4
  return `blur(${blur}px) brightness(${bri})`
}

export default function HeroCarousel({ onStartFlipping }) {
  const [active, setActive] = useState(0)
  const [glitch, setGlitch] = useState(false)
  const stageRef = useRef(null)
  const innerRefs = useRef([])
  const outerRefs = useRef([])
  const btnRef = useRef(null)
  const sectionRef = useRef(null)
  const watermarkRef = useRef(null)
  const auroraRefs = useRef([])
  const bracketRefs = useRef([])
  const headlineRef = useRef(null)
  const mouse = useRef({ x: -9999, y: -9999, nx: 0, ny: 0 })
  const phiRef = useRef(0)

  useEffect(() => {
    let raf, last = performance.now(), lastFront = -1
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now
      phiRef.current -= 20 * dt
      const phi = phiRef.current
      if (stageRef.current) stageRef.current.style.transform = `rotateY(${phi}deg)`
      const phiRad = (phi * Math.PI) / 180
      let best = -1, bestC = -2
      for (let i = 0; i < N; i++) {
        const ang = phiRad + (i / N) * 2 * Math.PI
        const c = Math.cos(ang)
        const d = (c + 1) / 2
        const z = RADIUS * c
        const inner = innerRefs.current[i]
        const outer = outerRefs.current[i]
        if (inner) {
          inner.style.opacity = (0.5 + 0.5 * d).toFixed(2)
          inner.style.filter = dofFilter(z)
          inner.style.transform = `scale(${(0.9 + 0.18 * d).toFixed(3)})`
        }
        if (outer) outer.style.zIndex = String(Math.round(d * 100))
        if (c > bestC) { bestC = c; best = i }
      }
      if (best !== lastFront) { lastFront = best; setActive(best) }

      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dist = Math.hypot(mouse.current.x - cx, mouse.current.y - cy)
        const pull = dist < 120 ? 1 - dist / 120 : 0
        const tx = clamp((mouse.current.x - cx) * pull * 0.35, -10, 10)
        const ty = clamp((mouse.current.y - cy) * pull * 0.35, -10, 10)
        btnRef.current.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`
      }

      const { nx, ny } = mouse.current
      if (watermarkRef.current) watermarkRef.current.style.transform = `translate(${(nx * -20).toFixed(1)}px, ${(ny * -20).toFixed(1)}px)`
      const aMul = [[30, 15], [-25, 20], [20, -25]]
      auroraRefs.current.forEach((el, i) => { if (el) el.style.transform = `translate(${(nx * aMul[i][0]).toFixed(1)}px, ${(ny * aMul[i][1]).toFixed(1)}px)` })
      const bMul = [[-8, -8], [8, -8], [-8, 8], [8, 8]]
      bracketRefs.current.forEach((el, i) => { if (el) el.style.transform = `translate(${(nx * bMul[i][0]).toFixed(1)}px, ${(ny * bMul[i][1]).toFixed(1)}px)` })
      if (headlineRef.current) headlineRef.current.style.transform = `translate(${(nx * 6).toFixed(1)}px, ${(ny * 4).toFixed(1)}px)`

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onMove = (e) => {
    const r = sectionRef.current?.getBoundingClientRect()
    const nx = r ? (e.clientX - r.left) / r.width - 0.5 : 0
    const ny = r ? (e.clientY - r.top) / r.height - 0.5 : 0
    mouse.current = { x: e.clientX, y: e.clientY, nx, ny }
  }
  const jumpTo = (i) => { phiRef.current = -(i / N) * 360; setActive(i) }

  const title = useTypewriter(HEADLINE, 1400, 60)
  useEffect(() => {
    if (title === HEADLINE) {
      setGlitch(true)
      const t = setTimeout(() => setGlitch(false), 800)
      return () => clearTimeout(t)
    }
  }, [title])

  const bigNum = useScramble('1,247,832')
  const [numKey, setNumKey] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setNumKey((k) => k + 1), 4000)
    return () => clearInterval(t)
  }, [])

  // Atmospheric aurora layers — grey + gold tones for depth
  const auroras = [
    { w: 700, h: 600, top: -180, left: -80,  bg: 'rgba(240,180,41,0.055)', blur: 90,  anim: 'aurora1 20s ease-in-out infinite alternate' },
    { w: 500, h: 500, top: '15%', right: -120, bg: 'rgba(200,210,230,0.03)', blur: 110, anim: 'aurora2 28s ease-in-out infinite alternate' },
    { w: 550, h: 420, bottom: -80, left: '25%', bg: 'rgba(240,180,41,0.03)', blur: 100, anim: 'aurora3 22s ease-in-out infinite alternate' },
  ]

  const headlineTextStyle = { fontFamily: F.display, fontWeight: 800, fontSize: 'clamp(42px,6vw,80px)', color: C.text, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0, whiteSpace: 'nowrap' }
  const ghostStyle = (color, dx, z) => ({ ...headlineTextStyle, position: 'absolute', top: 0, left: 0, right: 0, color, opacity: 0.7, mixBlendMode: 'screen', transform: `translateX(${dx}px)`, zIndex: z, pointerEvents: 'none', animation: 'glitchIn 0.8s linear forwards' })

  const CORNERS = [
    { top: 80, left: 40, hb: false }, { top: 80, right: 40, hb: false },
    { bottom: 40, left: 40, hb: true }, { bottom: 40, right: 40, hb: true },
  ]

  // Multi-layered grey background — not flat, has depth and tonal variation
  const sectionBg = [
    'radial-gradient(ellipse 75% 55% at 15% 18%, rgba(255,255,255,0.04) 0%, transparent 55%)',
    'radial-gradient(ellipse 55% 45% at 82% 78%, rgba(255,255,255,0.025) 0%, transparent 55%)',
    'radial-gradient(ellipse 45% 65% at 50% 50%, rgba(240,180,41,0.025) 0%, transparent 65%)',
    'linear-gradient(148deg, #1A1C22 0%, #161820 35%, #1D1F27 65%, #191B21 100%)',
  ].join(', ')

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMove}
      style={{ position: 'relative', minHeight: '100vh', background: sectionBg, overflow: 'hidden', paddingTop: 64, paddingBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}
    >
      {/* Aurora layers */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', animation: 'fade-in 1s 0.3s both' }}>
        {auroras.map((a, i) => (
          <div key={i} ref={(el) => (auroraRefs.current[i] = el)} style={{ position: 'absolute', top: a.top, bottom: a.bottom, left: a.left, right: a.right, willChange: 'transform' }}>
            <div style={{ width: a.w, height: a.h, borderRadius: '50%', background: `radial-gradient(circle, ${a.bg} 0%, transparent 65%)`, filter: `blur(${a.blur}px)`, animation: a.anim }} />
          </div>
        ))}
      </div>

      {/* Orb + blob */}
      <OrbBlob />

      {/* Watermark */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0, pointerEvents: 'none', animation: 'fade-in 0.8s 0.5s both' }}>
        <div ref={watermarkRef} style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(80px,14vw,220px)', color: 'rgba(255,255,255,0.012)', letterSpacing: '0.3em', whiteSpace: 'nowrap', willChange: 'transform' }}>STACKD</div>
      </div>

      {/* Data particles */}
      <DataParticles />

      {/* Corner brackets */}
      {CORNERS.map((c, i) => (
        <div key={i} ref={(el) => (bracketRefs.current[i] = el)} style={{ position: 'absolute', width: 36, height: 36, top: c.top, bottom: c.bottom, left: c.left, right: c.right, zIndex: 1, pointerEvents: 'none', willChange: 'transform', animation: 'fade-in 0.4s 0.7s both' }}>
          <div style={{ position: 'absolute', background: C.accent, opacity: 0.25, width: 36, height: 1.5, top: c.hb ? undefined : 0, bottom: c.hb ? 0 : undefined, left: c.right != null ? undefined : 0, right: c.right != null ? 0 : undefined }} />
          <div style={{ position: 'absolute', background: C.accent, opacity: 0.25, width: 1.5, height: 36, top: c.hb ? undefined : 0, bottom: c.hb ? 0 : undefined, left: c.right != null ? undefined : 0, right: c.right != null ? 0 : undefined }} />
        </div>
      ))}

      {/* ── 3D carousel ── */}
      <div className="hero-carousel-outer" style={{ width: '100%', overflow: 'hidden' }}>
        <div className="hero-carousel-wrap" style={{ width: 900, height: 500, margin: '0 auto', position: 'relative', perspective: 1200, perspectiveOrigin: '50% 50%', zIndex: 4, animation: 'hero-in-up 0.6s 0.9s both' }}>
          <div ref={stageRef} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
            {PANELS.map((p, i) => {
              const { Comp } = p
              return (
                <div
                  key={i}
                  ref={(el) => (outerRefs.current[i] = el)}
                  onClick={() => jumpTo(i)}
                  style={{ position: 'absolute', top: '50%', left: '50%', width: 320, height: 400, marginLeft: -160, marginTop: -200, transform: baseTransform(i), transformStyle: 'preserve-3d', cursor: 'pointer' }}
                >
                  <div ref={(el) => (innerRefs.current[i] = el)} style={{ width: '100%', height: '100%', willChange: 'opacity, transform, filter' }}>
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'rgba(20,22,29,0.94)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderTop: '1.5px solid rgba(240,180,41,0.45)',
                      borderRadius: 16,
                      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                      overflow: 'hidden',
                      boxShadow: '0 0 0 1px rgba(240,180,41,0.18), 0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(240,180,41,0.07)',
                    }}>
                      <Comp />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Headline + CTA ── */}
      <div ref={headlineRef} style={{ position: 'relative', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px', willChange: 'transform', animation: 'fade-in 0.6s 1.4s both' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13, color: C.text }}>🔥 HOT</span>
          <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 11, color: C.text, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '3px 10px' }}>RESALE</span>
        </div>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: 760 }}>
          {glitch && <span aria-hidden style={ghostStyle('#FF4444', -3, 1)}>{HEADLINE}</span>}
          {glitch && <span aria-hidden style={ghostStyle('#4444FF', 3, 2)}>{HEADLINE}</span>}
          <h1 style={{ ...headlineTextStyle, position: 'relative', zIndex: 3, animation: glitch ? 'sliceGlitch 0.6s ease-in-out' : undefined }}>
            {title}<span style={{ display: 'inline-block', width: 4, height: '0.9em', background: C.accent, marginLeft: 4, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
          </h1>
        </div>
        <p style={{ fontFamily: F.display, fontWeight: 400, fontSize: 18, color: 'rgba(240,239,232,0.45)', maxWidth: 480, marginTop: 12, marginBottom: 32 }}>
          AI scans thousands of real listings to find you the best deals.
        </p>
        <button
          ref={btnRef}
          onClick={onStartFlipping}
          style={{ background: C.accent, color: '#0A0A0A', fontFamily: F.display, fontWeight: 800, fontSize: 'clamp(16px,2vw,20px)', padding: '20px 52px', borderRadius: 12, border: 'none', cursor: 'pointer', animation: 'cta-pulse-big 2s ease-in-out infinite', transition: 'background 250ms', willChange: 'transform' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.accentHover; e.currentTarget.style.boxShadow = '0 0 60px rgba(240,180,41,0.4)'; e.currentTarget.style.animation = 'none' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.animation = 'cta-pulse-big 2s ease-in-out infinite' }}
        >
          SCAN FOR DEALS →
        </button>
        <p key={numKey} style={{ fontFamily: F.display, fontWeight: 400, fontSize: 13, color: 'rgba(240,239,232,0.28)', marginTop: 16 }}>
          Join 1,200+ flippers already stacking profit · <span style={{ fontFamily: F.mono, color: 'rgba(240,239,232,0.38)' }}>{bigNum}</span> listings live
        </p>
      </div>

      {/* ── Thumbnail strip ── */}
      <div style={{ position: 'relative', zIndex: 25, display: 'flex', gap: 8, justifyContent: 'center', animation: 'fade-in 0.5s 2s both' }}>
        {PANELS.map((p, i) => {
          const Icon = p.Icon
          const on = i === active
          return (
            <button key={i} onClick={() => jumpTo(i)} aria-label={`Panel ${i + 1}`}
              style={{
                width: 48, height: 48, borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? 'rgba(240,180,41,0.1)' : 'rgba(255,255,255,0.04)',
                border: on ? `1.5px solid ${C.accent}` : '1px solid rgba(255,255,255,0.09)',
                boxShadow: on ? '0 0 20px rgba(240,180,41,0.25)' : 'none',
                transition: 'all 200ms ease',
              }}>
              <Icon size={19} color={on ? C.accent : 'rgba(255,255,255,0.4)'} />
            </button>
          )
        })}
      </div>

      {/* Soft vignette — not a heavy CRT effect */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(15,16,22,0.35) 100%)', animation: 'fade-in 0.4s 0.1s both' }} />
    </section>
  )
}
