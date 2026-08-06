import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Lock } from 'lucide-react'
import { C, F } from '../theme'
import { useAuth } from '../lib/useAuth'

function CountUp({ to, duration = 1200 }) {
  const [val, setVal] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    const end = Number(to) || 0
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * end))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [to, duration])
  return <span>{val.toLocaleString()}</span>
}

const DIFFICULTY = {
  Easy:   { bg: 'rgba(240,180,41,0.08)', color: C.accent },
  Medium: { bg: 'rgba(255,215,0,0.08)', color: C.warn },
  Hard:   { bg: 'rgba(255,107,107,0.08)', color: C.danger },
}

const sectionLabel = { fontFamily: F.display, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3, margin: '0 0 10px' }

function LinkPill({ link }) {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.panelBorder}`,
        fontFamily: F.display, fontSize: 12, fontWeight: 500, color: C.text2,
        textDecoration: 'none', transition: 'background 0.2s, color 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.panelBorder }}
    >
      {link.label || link.platform}
      <ExternalLink size={12} />
    </a>
  )
}

function FlipCard({ flip, onSave, saved, index, onUpgrade }) {
  const { isPro } = useAuth()
  const [showGuide, setShowGuide] = useState(false)
  const [hovered, setHovered] = useState(false)
  const pct = flip.buyPrice ? Math.round((flip.profit / flip.buyPrice) * 100) : flip.margin
  const diff = DIFFICULTY[flip.difficulty] || DIFFICULTY.Medium

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${hovered ? C.panelBorderHover : C.panelBorder}`, borderRadius: 20,
        overflow: 'hidden', transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 17, color: C.text, margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', filter: isPro ? 'none' : 'blur(6px)', userSelect: isPro ? 'auto' : 'none' }}>{flip.name}</h3>
            <p style={{ fontFamily: F.display, fontWeight: 500, fontSize: 11, color: C.text3, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {isPro ? (flip.category || flip.description || 'Resale') : <span style={{ color: C.accent }}>🔒 Unlock item with Pro</span>}
            </p>
          </div>
          <div style={{ background: 'rgba(240,180,41,0.1)', border: `1px solid ${C.accentBorder}`, color: C.accent, fontFamily: F.mono, fontWeight: 700, fontSize: 13, padding: '4px 12px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}>
            +${flip.profit} ({pct}%)
          </div>
        </div>

        {/* Buy → Sell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: C.text3, marginBottom: 2, textTransform: 'uppercase' }}>BUY</div>
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: C.text, lineHeight: 1 }}>${flip.buyPrice}</div>
            <div style={{ fontFamily: F.display, fontSize: 11, color: C.text3, marginTop: 4 }}>{flip.buyPlatform}</div>
          </div>
          <div style={{ color: C.accent, fontSize: 22, flexShrink: 0 }}>→</div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 10, color: C.text3, marginBottom: 2, textTransform: 'uppercase' }}>SELL</div>
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: C.accent, lineHeight: 1 }}>${flip.sellPrice}</div>
            <div style={{ fontFamily: F.display, fontSize: 11, color: C.text3, marginTop: 4 }}>{flip.sellPlatform}</div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {flip.timeToSell && <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: C.text2 }}>{flip.timeToSell}</span>}
          {flip.difficulty && <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: diff.bg, color: diff.color, textTransform: 'uppercase' }}>{flip.difficulty}</span>}
          {flip.verified && <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: C.accentBg, color: C.accent }}>✓ {flip.marketData ? `Verified · ${flip.priceSource || 'StockX'}` : `${flip.compStats?.count || ''} sold comps`}</span>}
          {!flip.verified && <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: 'rgba(255,107,107,0.08)', color: C.danger }}>⚠ Estimate — unverified</span>}
          {flip.liquidity && (() => {
            const L = flip.liquidity
            const map = { liquid: { t: '💧 Sells fast', c: C.accent, bg: C.accentBg }, moderate: { t: '💧 Moderate demand', c: C.text2, bg: 'rgba(255,255,255,0.05)' }, slow: { t: '🐌 Slow mover', c: C.danger, bg: 'rgba(255,107,107,0.08)' } }
            const m = map[L.rating] || map.moderate
            return <span title={`${L.soldCount} recent sales vs ${L.activeTotal} active listings`} style={{ fontFamily: F.display, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: m.bg, color: m.c }}>{m.t}</span>
          })()}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isPro ? (
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{
                flex: 1, padding: 10, cursor: 'pointer', borderRadius: 8,
                fontFamily: F.display, fontSize: 13, fontWeight: 600,
                background: showGuide ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: `1px solid ${C.panelBorder}`,
                color: showGuide ? C.text : C.text2,
                transition: 'background 0.2s, color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { if (!showGuide) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text2 } e.currentTarget.style.borderColor = C.panelBorder }}
            >
              {showGuide ? 'Hide guide' : 'Show guide'}
            </button>
          ) : (
            <button
              onClick={() => onUpgrade?.()}
              style={{
                flex: 1, padding: 10, cursor: 'pointer', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontFamily: F.display, fontSize: 13, fontWeight: 700,
                background: C.accent, color: C.bg, border: 'none', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.06)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
            >
              <Lock size={13} /> Unlock item + buy link
            </button>
          )}
          <button
            onClick={() => onSave(flip)}
            style={{
              padding: '10px 22px', cursor: 'pointer', borderRadius: 8,
              fontFamily: F.display, fontSize: 13, fontWeight: 600,
              background: saved ? C.accent : 'transparent',
              border: saved ? 'none' : `1px solid ${C.panelBorder}`,
              color: saved ? C.bg : C.text2,
              transition: 'all 0.2s',
            }}
          >
            {saved ? '✓ Saved' : '+ Save'}
          </button>
        </div>
      </div>

      {/* Guide */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${C.panelBorder}` }}
          >
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Card/game live market price (PriceCharting) */}
              {flip.marketData?.type === 'card' && (() => {
                const md = flip.marketData
                const isTcg = md.market != null || md.low != null
                const cells = isTcg
                  ? [['Market', md.market], ['Low', md.low], ['Median', md.median]]
                  : [['Ungraded', md.ungraded], ['Grade 9', md.grade9], ['PSA 10', md.psa10]]
                return (
                <div style={{ background: 'rgba(240,180,41,0.06)', border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <p style={{ ...sectionLabel, margin: 0 }}>Live market price</p>
                    <span style={{ fontFamily: F.display, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.accent, borderRadius: 4, padding: '2px 6px' }}>{isTcg ? 'TCGplayer' : 'PriceCharting'}</span>
                  </div>
                  {(md.set || md.rarity) && <p style={{ fontFamily: F.display, fontSize: 12, color: C.text3, margin: '0 0 10px' }}>{[md.set, md.number, md.rarity].filter(Boolean).join(' · ')}</p>}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {cells.filter(([, v]) => v != null).map(([label, v], i) => (
                      <div key={i}>
                        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: i === 0 ? C.accent : C.text, lineHeight: 1 }}>${v}</div>
                        <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })()}
              {/* Live StockX/GOAT market price — verified sell price source */}
              {flip.marketData && flip.marketData.type !== 'card' && (
                <div style={{ background: 'rgba(240,180,41,0.06)', border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <p style={{ ...sectionLabel, margin: 0 }}>Live market price</p>
                    <span style={{ fontFamily: F.display, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.accent, borderRadius: 4, padding: '2px 6px' }}>{flip.priceSource || 'StockX'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {flip.marketData.perSize != null && (
                      <div>
                        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.accent, lineHeight: 1 }}>${flip.marketData.perSize}</div>
                        <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>StockX · size {flip.marketData.size}</div>
                      </div>
                    )}
                    {flip.marketData.stockX != null && (
                      <div>
                        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1 }}>${flip.marketData.stockX}</div>
                        <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>StockX low</div>
                      </div>
                    )}
                    {flip.marketData.goat != null && (
                      <div>
                        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1 }}>${flip.marketData.goat}</div>
                        <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>GOAT</div>
                      </div>
                    )}
                    {flip.marketData.lastSale != null && (
                      <div>
                        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1 }}>${flip.marketData.lastSale}</div>
                        <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>Last sale</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Verified sold comps — real eBay completed sales */}
              {flip.compStats && (
                <div style={{ background: 'rgba(240,180,41,0.04)', border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <p style={{ ...sectionLabel, margin: 0 }}>Sold comps</p>
                    <span style={{ fontFamily: F.display, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.accent, borderRadius: 4, padding: '2px 6px' }}>Verified</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.accent, lineHeight: 1 }}>${flip.compStats.median}</div>
                      <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>Median sold</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1 }}>${flip.compStats.low}–${flip.compStats.high}</div>
                      <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>Range</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1 }}>{flip.compStats.count}</div>
                      <div style={{ fontFamily: F.display, fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase' }}>Real sales</div>
                    </div>
                  </div>
                  {flip.compsPeriod && <p style={{ fontFamily: F.display, fontSize: 11, color: C.text3, margin: '8px 0 0' }}>{flip.compsPeriod}</p>}
                  {flip.soldComps?.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${C.panelBorder}`, paddingTop: 12 }}>
                      {flip.soldComps.slice(0, 5).map((c, i) => (
                        <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none' }}>
                          <span style={{ fontFamily: F.display, fontSize: 12, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.size ? `${c.size} · ` : ''}{c.condition}
                          </span>
                          <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 13, color: C.text, flexShrink: 0 }}>${c.soldPrice}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!flip.compStats && flip.soldCompsEvidence && (
                <div style={{ background: 'rgba(255,107,107,0.05)', borderLeft: '2px solid rgba(255,107,107,0.5)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                  <p style={{ fontFamily: F.display, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{flip.soldCompsEvidence}</p>
                </div>
              )}

              {flip.costBreakdown && (
                <div>
                  <p style={sectionLabel}>Real cost breakdown</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      ['Buy price', `$${flip.costBreakdown.buyPrice}`],
                      ['Shipping in', flip.costBreakdown.inboundShipping ? `$${flip.costBreakdown.inboundShipping}` : 'Free'],
                      [`${flip.sellPlatform} fees`, `−$${flip.costBreakdown.fees}`],
                      ['Shipping out', `−$${flip.costBreakdown.outboundShipping}`],
                    ].map(([k, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.display, fontSize: 13, color: C.text2 }}>
                        <span>{k}</span><span style={{ fontFamily: F.mono }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.panelBorder}`, paddingTop: 8, marginTop: 2 }}>
                      <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.text }}>Net profit</span>
                      <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 15, color: C.accent }}>${flip.profit}</span>
                    </div>
                  </div>
                </div>
              )}

              {flip.steps?.length > 0 && (
                <div>
                  <p style={sectionLabel}>Step-by-step</p>
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {flip.steps.map((step, i) => (
                      <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'rgba(240,180,41,0.1)', border: `1px solid ${C.accentBorder}`, color: C.accent, fontFamily: F.display, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                        <span style={{ fontFamily: F.display, fontSize: 14, color: C.text2, lineHeight: 1.6 }}>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {flip.proTip && (
                <div style={{ background: 'rgba(240,180,41,0.05)', borderLeft: `2px solid ${C.accent}`, borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.accent, marginBottom: 6 }}>Pro tip</p>
                  <p style={{ fontFamily: F.display, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{flip.proTip}</p>
                </div>
              )}

              {flip.redFlags?.length > 0 && (
                <div style={{ background: 'rgba(255,107,107,0.05)', borderLeft: '2px solid rgba(255,107,107,0.5)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,107,107,0.8)', marginBottom: 6 }}>Red flags</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {flip.redFlags.map((f, i) => <li key={i} style={{ fontFamily: F.display, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>• {f}</li>)}
                  </ul>
                </div>
              )}

              {flip.buyLinks?.length > 0 && (
                <div>
                  <p style={sectionLabel}>Where to buy</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{flip.buyLinks.map((link, i) => <LinkPill key={i} link={link} />)}</div>
                </div>
              )}
              {flip.sellLinks?.length > 0 && (
                <div>
                  <p style={sectionLabel}>Where to sell</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{flip.sellLinks.map((link, i) => <LinkPill key={i} link={link} />)}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ResultsScreen({ flips, onBack }) {
  const [savedIds, setSavedIds] = useState(() => {
    const s = localStorage.getItem('stackd_saved')
    return new Set(s ? JSON.parse(s).map(f => f.id) : [])
  })

  const handleSave = (flip) => {
    const stored = localStorage.getItem('stackd_saved')
    const existing = stored ? JSON.parse(stored) : []
    const isSaved = existing.find(f => f.id === flip.id)
    const updated = isSaved ? existing.filter(f => f.id !== flip.id) : [...existing, { ...flip, status: 'Found', savedAt: Date.now() }]
    localStorage.setItem('stackd_saved', JSON.stringify(updated))
    setSavedIds(new Set(updated.map(f => f.id)))
  }

  const totalProfit = flips.reduce((sum, f) => sum + f.profit, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: 1000, margin: '0 auto', padding: '120px 24px 60px' }}>
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}
      >
        <div>
          <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 10 }}>Results</p>
          <h2 style={{ margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 'clamp(36px,6vw,56px)', color: C.text }}>Flip </span>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(36px,6vw,56px)', color: C.accent }}>opportunities.</span>
          </h2>
        </div>
        <button onClick={onBack} className="btn-ghost">← Search again</button>
      </motion.div>

      {/* Profit banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{
          background: 'rgba(240,180,41,0.04)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 20, padding: '28px 32px', marginBottom: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          boxShadow: '0 0 60px rgba(240,180,41,0.05)',
        }}
      >
        <div>
          <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.accent, marginBottom: 6 }}>Total potential profit</p>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 60, lineHeight: 1, color: C.text }}>
            $<CountUp to={totalProfit} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: 'rgba(255,255,255,0.15)' }}>{flips.length} deals</div>
          <p style={{ fontFamily: F.display, fontSize: 12, color: C.text3, marginTop: 4 }}>Save them to track status</p>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {flips.map((flip, i) => (
          <FlipCard key={flip.id} flip={flip} index={i} onSave={handleSave} saved={savedIds.has(flip.id)} onUpgrade={onBack} />
        ))}
      </div>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <button onClick={onBack} className="btn-ghost">← Search again</button>
      </div>
      <div style={{ height: 60 }} />
    </motion.div>
  )
}
