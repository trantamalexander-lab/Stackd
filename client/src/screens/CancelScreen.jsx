import { motion } from 'framer-motion'
import { C, F } from '../theme'

export default function CancelScreen({ onGoHome }) {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 40px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: 36, color: C.text2,
        }}>
          ✕
        </div>

        <p style={{ fontFamily: F.mono, fontSize: 10, color: C.text3, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
          PAYMENT CANCELLED
        </p>
        <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(40px, 8vw, 64px)', color: C.text, margin: '0 0 12px', lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          No worries.
        </h1>
        <p style={{ fontFamily: F.display, fontSize: 15, color: C.text2, maxWidth: 340, margin: '0 auto 36px', lineHeight: 1.6 }}>
          You weren't charged. Come back when you're ready to start stacking.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onGoHome} className="btn-primary" style={{ fontSize: 13 }}>
            Back to App
          </button>
          <button
            onClick={() => { onGoHome(); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
            className="btn-ghost"
          >
            See Pricing
          </button>
        </div>
      </motion.div>
    </div>
  )
}
