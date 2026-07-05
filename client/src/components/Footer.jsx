import { C, F } from '../theme'

export default function Footer() {
  return (
    <footer style={{ position: 'relative', zIndex: 1, background: C.bg, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '36px 24px 24px', textAlign: 'center' }}>
        <div style={{ width: 60, height: 1, background: C.accent, opacity: 0.3, margin: '0 auto 32px' }} />
        <p style={{
          fontFamily: F.display, fontSize: 11, fontWeight: 400, lineHeight: 1.6,
          color: C.text3, margin: '0 0 16px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Stackd is an AI-powered discovery tool for informational purposes only.
          We do not guarantee the accuracy of pricing data, profit margins, or
          listing availability. Market prices fluctuate and past resale performance
          does not guarantee future results. Always verify listings independently
          before making any purchase. Stackd is not responsible for any financial
          losses. By using this app you agree to conduct your own due diligence.
        </p>
        <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.2)', margin: 0, letterSpacing: '0.06em' }}>
          © 2026 Stackd. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
