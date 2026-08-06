import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StackdLogo from './components/StackdLogo'
import SearchScreen from './screens/SearchScreen'
import ResultsScreen from './screens/ResultsScreen'
import SavedScreen from './screens/SavedScreen'
import SuccessScreen from './screens/SuccessScreen'
import CancelScreen from './screens/CancelScreen'
import Background from './components/Background'
import Footer from './components/Footer'
import { getCredits } from './credits'
import { C, F } from './theme'
import './index.css'

// Detect /success or /cancel from URL on load
function getInitialScreen() {
  const path = window.location.pathname
  if (path === '/success') return 'success'
  if (path === '/cancel') return 'cancel'
  return 'search'
}

export default function App() {
  const [screen, setScreen] = useState(getInitialScreen)
  const [flips, setFlips] = useState([])
  const [credits, setCredits] = useState(getCredits)
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => { setCredits(getCredits()) }, [screen])

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(h > 0 ? (window.scrollY / h) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleResults = (data) => {
    setCredits(getCredits())
    setFlips(data)
    setScreen('results')
  }

  const navLink = {
    fontFamily: F.display, fontSize: 14, fontWeight: 500,
    color: 'rgba(255,255,255,0.55)', cursor: 'pointer', background: 'none', border: 'none',
    transition: 'color 0.2s ease', padding: '4px 0',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, position: 'relative' }}>
      <Background />

      {/* scroll progress indicator (left edge) */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: 2, height: `${scrollPct}vh`, background: C.accent, zIndex: 999, transition: 'height 0.1s linear', boxShadow: '0 0 8px rgba(240,180,41,0.5)' }} />


      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ height: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <button onClick={() => setScreen('search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
            <StackdLogo size={24} />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.text, letterSpacing: '0.2em' }}>STACKD</span>
          </button>

          {/* Center links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {[
              { label: 'How it works', id: 'how-it-works' },
              { label: 'Pricing', id: 'pricing' },
            ].map(l => (
              <button key={l.id}
                onClick={() => {
                  if (screen !== 'search') { setScreen('search'); setTimeout(() => document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' }), 80) }
                  else document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={navLink}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              >{l.label}</button>
            ))}
            <button onClick={() => setScreen('saved')}
              style={{ ...navLink, color: screen === 'saved' ? C.accent : 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => { if (screen !== 'saved') e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { if (screen !== 'saved') e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
            >Saved</button>
          </div>

          {/* Right: credits + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              fontFamily: F.mono, fontSize: 13, fontWeight: 400,
              color: credits > 0 ? C.accent : 'rgba(255,255,255,0.5)',
              padding: '4px 10px', borderRadius: 6,
              border: `1px solid ${credits > 0 ? 'rgba(240,180,41,0.3)' : 'rgba(255,255,255,0.12)'}`,
            }}>
              {credits} left
            </div>

            <button
              onClick={() => {
                if (screen !== 'search') { setScreen('search'); setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }), 80) }
                else document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{
                fontFamily: F.display, fontWeight: 700, fontSize: 13,
                background: C.accent, color: C.bg, border: 'none',
                padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
                transition: 'filter 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)' }}>
              Get Credits
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <motion.div
        key={screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {screen === 'search' && <SearchScreen onResults={handleResults} credits={credits} onCreditsChange={setCredits} />}
        {screen === 'results' && <ResultsScreen flips={flips} onBack={() => setScreen('search')} />}
        {screen === 'saved' && <SavedScreen />}
        {screen === 'success' && <SuccessScreen onGoHome={() => { window.history.replaceState({}, '', '/'); setCredits(getCredits()); setScreen('search') }} />}
        {screen === 'cancel' && <CancelScreen onGoHome={() => { window.history.replaceState({}, '', '/'); setScreen('search') }} />}
        <Footer />
      </motion.div>
    </div>
  )
}
