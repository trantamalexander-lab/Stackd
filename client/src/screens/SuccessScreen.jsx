import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { addCredits } from '../credits'
import { C, F } from '../theme'

const PLAN_NAMES = { pro: 'Starter', premium: 'Pro' }
const PLAN_CREDITS = { pro: 4, premium: 12 }

export default function SuccessScreen({ onGoHome }) {
  const [status, setStatus] = useState('verifying') // 'verifying' | 'done' | 'error'
  const [credits, setCredits] = useState(0)
  const [plan, setPlan] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const planParam = params.get('plan')

    if (!sessionId) { setStatus('error'); return }

    fetch(`/api/verify-session?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.paid) {
          const granted = data.credits || PLAN_CREDITS[planParam] || 5
          addCredits(granted)
          setCredits(granted)
          setPlan(data.plan || planParam)
          setStatus('done')
          window.history.replaceState({}, '', '/success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 40px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}
      >
        {status === 'verifying' && (
          <>
            <svg style={{ animation: 'spin 0.8s linear infinite', width: 48, height: 48, margin: '0 auto 20px', display: 'block' }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(240,180,41,0.2)" strokeWidth="3"/>
              <path d="M4 12a8 8 0 018-8" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <p style={{ fontFamily: F.mono, fontSize: 12, color: C.accentDim, letterSpacing: '0.15em' }}>VERIFYING PAYMENT...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(240,180,41,0.1)',
                border: '2px solid rgba(240,180,41,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 28px',
                boxShadow: '0 0 60px rgba(240,180,41,0.2)',
              }}
            >
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontSize: 44, color: C.accent }}
              >✓</motion.span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <p style={{ fontFamily: F.mono, fontSize: 10, color: C.accentDim, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                PAYMENT CONFIRMED
              </p>
              <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(40px, 9vw, 68px)', lineHeight: 0.95, color: C.text, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                You're stacking.
              </h1>
              <p style={{ fontFamily: F.display, fontSize: 16, color: C.text2, marginBottom: 32 }}>
                {PLAN_NAMES[plan] || 'Plan'} activated — <span style={{ color: C.accent, fontWeight: 700 }}>{credits} searches</span> added to your account
              </p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 14,
                  background: 'rgba(240,180,41,0.06)', border: '1px solid rgba(240,180,41,0.3)',
                  borderRadius: 16, padding: '16px 24px', marginBottom: 32,
                }}
              >
                <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 48, color: C.accent, lineHeight: 1 }}>{credits}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: F.display, fontSize: 9, color: C.accentDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>SEARCHES</div>
                  <div style={{ fontFamily: F.display, fontSize: 13, color: C.text2 }}>Ready to use now</div>
                </div>
              </motion.div>

              <div>
                <button onClick={onGoHome} className="btn-primary" style={{ fontSize: 14, padding: '14px 36px' }}>
                  Run my first scan →
                </button>
              </div>
            </motion.div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
            <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, color: C.text, margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontFamily: F.display, fontSize: 15, color: C.text2, marginBottom: 28 }}>
              We couldn't verify your payment. If you were charged, contact support — your credits will be added manually.
            </p>
            <button onClick={onGoHome} className="btn-ghost">← Go Back</button>
          </>
        )}
      </motion.div>
    </div>
  )
}
