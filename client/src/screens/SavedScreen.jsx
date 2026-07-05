import { useState } from 'react'
import { motion } from 'framer-motion'
import { C, F } from '../theme'

const STATUSES = ['Found', 'Bought', 'Listed', 'Sold']

export default function SavedScreen() {
  const [flips, setFlips] = useState(() => {
    const s = localStorage.getItem('stackd_saved')
    return s ? JSON.parse(s) : []
  })

  const updateStatus = (id, status) => {
    const updated = flips.map(f => f.id === id ? { ...f, status } : f)
    setFlips(updated)
    localStorage.setItem('stackd_saved', JSON.stringify(updated))
  }

  const removeFlip = (id) => {
    const updated = flips.filter(f => f.id !== id)
    setFlips(updated)
    localStorage.setItem('stackd_saved', JSON.stringify(updated))
  }

  const totalEarned = flips.filter(f => f.status === 'Sold').reduce((sum, f) => sum + f.profit, 0)
  const totalPending = flips.filter(f => f.status !== 'Sold').reduce((sum, f) => sum + f.profit, 0)
  const soldCount = flips.filter(f => f.status === 'Sold').length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '120px 24px 60px' }}>
      <p className="section-label" style={{ marginBottom: 12 }}>DASHBOARD</p>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(36px,6vw,64px)', color: C.text, marginBottom: 36, lineHeight: 0.95, letterSpacing: '-0.03em' }}>
        Saved flips.
      </h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Earned', value: `$${totalEarned}`, accent: true },
          { label: 'Pending profit', value: `$${totalPending}` },
          { label: 'Sold', value: soldCount },
        ].map(s => (
          <div key={s.label} style={{
            background: s.accent ? 'rgba(240,180,41,0.04)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${s.accent ? 'rgba(240,180,41,0.25)' : C.panelBorder}`,
            borderRadius: 16, padding: 20,
          }}>
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: s.accent ? C.accent : C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontFamily: F.display, fontSize: 12, color: C.text3, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {totalEarned > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'rgba(240,180,41,0.05)', border: '1px solid rgba(240,180,41,0.2)', borderRadius: 16, padding: '24px 28px', marginBottom: 28, boxShadow: '0 0 60px rgba(240,180,41,0.06)' }}
        >
          <p style={{ fontFamily: F.display, fontSize: 10, color: C.accentDim, marginBottom: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>TOTAL PROFIT EARNED</p>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 56, color: C.accent, lineHeight: 1, letterSpacing: '-0.02em' }}>${totalEarned}</div>
        </motion.div>
      )}

      {flips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 120, color: 'rgba(255,255,255,0.03)', lineHeight: 1, marginBottom: 20 }}>$0</div>
          <p style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: 'rgba(255,255,255,0.2)', marginBottom: 8 }}>No saved flips yet</p>
          <p style={{ fontFamily: F.display, fontSize: 14, color: C.text3 }}>Find a flip and tap + Save to track it here</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {flips.map((flip, i) => {
            const isSold = flip.status === 'Sold'
            return (
              <motion.div
                key={flip.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isSold ? 'rgba(240,180,41,0.25)' : C.panelBorder}`, borderRadius: 16, overflow: 'hidden' }}
              >
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: C.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{flip.name}</h3>
                      <p style={{ fontFamily: F.mono, fontSize: 11, color: C.text3, margin: 0 }}>BUY ${flip.buyPrice} → SELL ${flip.sellPrice}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.accent, lineHeight: 1 }}>+${flip.profit}</div>
                      <span style={{ fontFamily: F.display, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 6, background: isSold ? 'rgba(240,180,41,0.1)' : 'transparent', border: `1px solid ${isSold ? 'rgba(240,180,41,0.3)' : C.panelBorder}`, color: isSold ? C.accent : C.text3 }}>
                        {flip.status}
                      </span>
                    </div>
                  </div>

                  {/* Status tracker */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {STATUSES.map((status) => {
                      const currentIdx = STATUSES.indexOf(flip.status)
                      const si = STATUSES.indexOf(status)
                      const isActive = flip.status === status
                      const isPast = si < currentIdx
                      return (
                        <button key={status} onClick={() => updateStatus(flip.id, status)} style={{
                          flex: 1, padding: '6px 0', cursor: 'pointer', borderRadius: 6,
                          fontFamily: F.display, fontSize: 10, fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.15s',
                          background: isActive ? 'rgba(240,180,41,0.1)' : 'transparent',
                          border: `1px solid ${isActive ? 'rgba(240,180,41,0.35)' : C.panelBorder}`,
                          color: isActive ? C.accent : isPast ? 'rgba(255,255,255,0.4)' : C.text3,
                        }}>
                          {status}
                        </button>
                      )
                    })}
                  </div>

                  <button onClick={() => removeFlip(flip.id)} style={{ fontFamily: F.display, fontSize: 10, color: C.text3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.danger}
                    onMouseLeave={e => e.currentTarget.style.color = C.text3}
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
      <div style={{ height: 60 }} />
    </div>
  )
}
