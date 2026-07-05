import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Cpu, TrendingUp, Check } from 'lucide-react'
import { addCredits, useCredit, getCredits } from '../credits'
import HeroCarousel from '../components/HeroCarousel'
import ProfitTicker from '../components/ProfitTicker'
import { Reveal, CountUp } from '../components/Reveal'
import { C, F } from '../theme'

const CATEGORIES = [
  { label: 'Sneakers', emoji: '👟' },
  { label: 'Streetwear', emoji: '🧥' },
  { label: 'Electronics', emoji: '📱' },
  { label: 'Sports Cards', emoji: '🃏' },
  { label: 'Video Games', emoji: '🎮' },
  { label: 'Vintage', emoji: '👗' },
  { label: 'Watches', emoji: '⌚' },
  { label: 'Trading Cards', emoji: '✨' },
]

const PLATFORMS = ['eBay', 'Facebook Marketplace', 'StockX', 'Depop', 'Poshmark']

// US men's sneaker sizes — size dramatically changes resale value, so we let
// users filter to the sizes they can actually buy/sell.
const SNEAKER_SIZES = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13']

const STATS = [
  { value: '1.2M+', label: 'Listings scanned daily' },
  { value: '24/7', label: 'Live data feed' },
  { value: '4.9★', label: 'Avg rating' },
  { value: '88%', label: 'Avg margin found' },
]

// NOTE: plan.id values ('pro', 'premium') are contract with the backend
// (/api/create-checkout-session) and SuccessScreen credit grants — do not rename.
const PLANS = [
  {
    id: 'pro', name: 'STARTER', price: '9.99', searches: 4,
    features: ['4 AI flip scans', 'Step-by-step flip guides', 'Red flag warnings', 'Save & track flips'],
    highlight: false, badge: null,
    cta: 'Get Started — $9.99/mo',
    value: '1 flip covers this',
  },
  {
    id: 'premium', name: 'PRO', price: '24.99', searches: 12,
    features: ['12 AI flip scans', 'Step-by-step flip guides', 'Red flag warnings', 'Save & track flips', 'Priority results'],
    highlight: true, badge: 'MOST POPULAR',
    cta: 'Go Pro — $24.99/mo',
    value: '1 good flip covers 6 months',
  },
]

const STEPS = [
  { n: '01', Icon: Search, title: 'Pick your categories', body: 'Sneakers, electronics, vintage, cards — choose what you know and what sells.' },
  { n: '02', Icon: Cpu, title: 'AI hunts for deals', body: 'Claude AI scans 1.2M+ real listings to surface the highest-margin opportunities under your budget.' },
  { n: '03', Icon: TrendingUp, title: 'Get your flip list', body: 'Buy price, sell price, profit margin, step-by-step guide. Everything you need to complete the flip.' },
]

const LOADING_MESSAGES = [
  'SCANNING EBAY SOLD LISTINGS...',
  'CHECKING STOCKX PRICES...',
  'BROWSING FACEBOOK MARKETPLACE...',
  'ANALYZING PROFIT MARGINS...',
  'FINDING HIDDEN GEMS...',
  'COMPARING RESALE VALUES...',
  'IDENTIFYING UNDERPRICED ITEMS...',
  'CRUNCHING NUMBERS...',
]

const eyebrow = { fontFamily: F.display, fontSize: 11, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 16 }
const configBox = { background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 16, padding: 28 }
const configLabel = { fontFamily: F.display, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', color: C.text3, marginBottom: 16, textTransform: 'uppercase' }

export default function SearchScreen({ onResults, credits, onCreditsChange }) {
  const [selectedCategories, setSelectedCategories] = useState(['Sneakers'])
  const [budget, setBudget] = useState(100)
  const [selectedPlatforms, setSelectedPlatforms] = useState(['eBay', 'StockX'])
  const [selectedSizes, setSelectedSizes] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [error, setError] = useState(null)
  const [purchaseMsg] = useState(null)

  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 2000)
    return () => clearInterval(t)
  }, [loading])

  const toggleCategory = cat =>
    setSelectedCategories(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat])
  const togglePlatform = p =>
    setSelectedPlatforms(p2 => p2.includes(p) ? p2.filter(x => x !== p) : [...p2, p])
  const toggleSize = s =>
    setSelectedSizes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  const sneakersSelected = selectedCategories.includes('Sneakers')

  const handlePurchase = async (plan) => {
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url  // Redirect to Stripe Checkout
      } else {
        setError(data.error || 'Could not start checkout')
      }
    } catch (err) {
      setError('Checkout failed — ' + err.message)
    }
  }

  const handleSearch = async () => {
    if (!selectedCategories.length) return setError('Pick at least one category.')
    if (!selectedPlatforms.length) return setError('Pick at least one platform.')
    if (credits <= 0) {
      setError('No searches left — grab a plan below.')
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    setError(null)
    setLoading(true)
    setLoadingMsgIdx(0)
    useCredit()
    onCreditsChange(getCredits())
    try {
      const res = await fetch('/api/flips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: selectedCategories,
          maxBudget: budget,
          platforms: selectedPlatforms,
          sizes: sneakersSelected ? selectedSizes : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      onResults(data.flips)
    } catch (err) {
      setError(err.message)
      addCredits(1)
      onCreditsChange(getCredits())
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ══ HERO CAROUSEL ══ */}
      <HeroCarousel onStartFlipping={() => document.getElementById('configure')?.scrollIntoView({ behavior: 'smooth' })} />

      {/* ══ PROFIT TICKER ══ */}
      <ProfitTicker />

      {/* ══ STATS BAR ══ */}
      <section style={{ background: C.bgRaised }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }} className="stats-grid">
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} y={16}
              style={{ textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
            >
              <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 42, color: C.accent, lineHeight: 1 }}><CountUp value={s.value} /></div>
              <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how-it-works" style={{ background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
          <Reveal style={{ marginBottom: 48 }}>
            <p style={eyebrow}>How it works</p>
            <h2 style={{ margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              <span style={{ display: 'block', fontFamily: F.display, fontWeight: 300, fontSize: 'clamp(38px,6vw,60px)', color: C.text }}>Three steps to</span>
              <span style={{ display: 'block', fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(38px,6vw,60px)', color: C.text }}>start stacking.</span>
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.15}
                style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 20, padding: '40px 32px' }}
              >
                <span style={{ position: 'absolute', bottom: -20, right: -10, fontFamily: F.mono, fontWeight: 700, fontSize: 120, lineHeight: 1, color: 'rgba(240,180,41,0.05)', pointerEvents: 'none' }}>{step.n}</span>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.accentBg, border: '1px solid rgba(240,180,41,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <step.Icon size={28} color={C.accent} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ width: 32, height: 2, background: C.accent, marginBottom: 16 }} />
                  <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: 14, color: C.text2, lineHeight: 1.6 }}>{step.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" style={{ background: C.bg, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 24px' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={eyebrow}>Pricing</p>
            <h2 style={{ margin: '0 0 16px', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', lineHeight: 1 }}>
              <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 'clamp(44px,9vw,64px)', color: C.text }}>Simple</span>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(44px,9vw,64px)', color: C.accent }}>Pricing.</span>
            </h2>
            <p style={{ fontFamily: F.display, fontWeight: 400, fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>
              One good flip pays for months of Stackd.
            </p>
          </Reveal>

          <AnimatePresence>
            {purchaseMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ maxWidth: 480, margin: '0 auto 32px', padding: 14, borderRadius: 10, background: C.accentBg, border: `1px solid ${C.accentBorder}`, fontFamily: F.display, fontSize: 13, color: C.accent, textAlign: 'center' }}
              >
                {purchaseMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, maxWidth: 680, margin: '48px auto 0' }}>
            {PLANS.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.1}
                style={{
                  background: plan.highlight ? 'rgba(240,180,41,0.04)' : 'rgba(255,255,255,0.03)',
                  border: plan.highlight ? '1.5px solid rgba(240,180,41,0.25)' : `1px solid ${C.panelBorder}`,
                  borderRadius: 20, padding: 40, position: 'relative',
                  boxShadow: plan.highlight ? '0 0 60px rgba(240,180,41,0.06)' : 'none',
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: C.accent, color: C.bg, borderRadius: 999,
                    fontFamily: F.display, fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.08em', padding: '6px 16px', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>{plan.badge}</div>
                )}
                <div style={{ fontFamily: F.display, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.text3, marginBottom: 16 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 52, color: C.text, lineHeight: 1 }}>${plan.price}</div>
                  <span style={{ fontFamily: F.display, fontWeight: 400, fontSize: 16, color: C.text3 }}>/mo</span>
                </div>
                <p style={{ fontFamily: F.display, fontWeight: 400, fontSize: 14, color: C.text2 }}>
                  {plan.searches} scans per month
                </p>
                <p style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 13, color: C.accent, marginTop: 4, marginBottom: 24 }}>
                  {plan.value}
                </p>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plan.features.map((f, fi) => (
                    <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.display, fontWeight: 400, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                      <Check size={16} color={C.accent} strokeWidth={2.4} style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handlePurchase(plan)}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10, cursor: 'pointer', marginTop: 32,
                    fontFamily: F.display, fontSize: 14, fontWeight: plan.highlight ? 700 : 600,
                    background: plan.highlight ? C.accent : 'transparent',
                    color: plan.highlight ? C.bg : C.text,
                    border: plan.highlight ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (plan.highlight) { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(240,180,41,0.25)' }
                    else { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }
                  }}
                  onMouseLeave={e => {
                    if (plan.highlight) { e.currentTarget.style.filter = 'none'; e.currentTarget.style.boxShadow = 'none' }
                    else { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent' }
                  }}>
                  {plan.cta}
                </button>
              </Reveal>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontFamily: F.display, fontWeight: 400, fontSize: 13, color: C.text3, marginTop: 32 }}>
            No subscription lock-in · Searches never expire · Instant activation
          </p>
        </div>
      </section>

      {/* ══ CONFIGURE ══ */}
      <section id="configure" style={{ background: C.bg, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '80px 24px' }}>
          <Reveal style={{ marginBottom: 48 }}>
            <p style={eyebrow}>Configure scan</p>
            <h2 style={{ margin: 0, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              <span style={{ fontFamily: F.display, fontWeight: 300, fontSize: 'clamp(36px,5vw,52px)', color: C.text }}>Build your </span>
              <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 'clamp(36px,5vw,52px)', color: C.text }}>flip list.</span>
            </h2>
            <p style={{ fontFamily: F.display, fontWeight: 400, fontSize: 16, color: 'rgba(255,255,255,0.45)', marginTop: 12 }}>Pick what you know, set a budget, and let the AI hunt.</p>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }} className="config-grid">
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={configBox}>
                <p style={configLabel}>01 · Categories</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(({ label, emoji }) => (
                    <button key={label} onClick={() => toggleCategory(label)} className={`cat-chip ${selectedCategories.includes(label) ? 'active' : ''}`}>
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>
              {sneakersSelected && (
                <motion.div
                  key="sneaker-size"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={configBox}
                >
                  <p style={configLabel}>
                    Sneaker size <span style={{ color: C.accent }}>· US men's</span>
                  </p>
                  <p style={{ fontFamily: F.display, fontSize: 12, color: C.text2, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
                    Size moves resale value hard — a 10 can profit 5× a 15. Pick the sizes you can flip, or leave blank for all.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SNEAKER_SIZES.map(s => (
                      <button key={s} onClick={() => toggleSize(s)} className={`cat-chip ${selectedSizes.includes(s) ? 'active' : ''}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              <div style={configBox}>
                <p style={configLabel}>02 · Platforms</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => togglePlatform(p)} className={`plat-chip ${selectedPlatforms.includes(p) ? 'active' : ''}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={configBox}>
                <p style={configLabel}>03 · Max budget</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontFamily: F.display, fontSize: 14, color: C.text2 }}>Buy items under</span>
                  <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: C.text, lineHeight: 1 }}>${budget}</span>
                </div>
                <input type="range" min={20} max={500} step={5} value={budget} onChange={e => setBudget(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, ${C.accent} 0%, ${C.accent} ${((budget - 20) / 480) * 100}%, rgba(255,255,255,0.1) ${((budget - 20) / 480) * 100}%, rgba(255,255,255,0.1) 100%)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: F.mono, fontSize: 11, color: C.text3 }}>
                  <span>$20</span><span>$500</span>
                </div>
              </div>

              <div style={{ background: 'rgba(240,180,41,0.04)', border: '1px solid rgba(240,180,41,0.15)', borderRadius: 12, padding: 16 }}>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Scan parameters</p>
                <p style={{ fontFamily: F.display, fontWeight: 500, fontSize: 14, color: C.text }}>
                  <span style={{ fontWeight: 700 }}>{selectedCategories.length}</span> categor{selectedCategories.length === 1 ? 'y' : 'ies'} ·{' '}
                  <span style={{ fontWeight: 700 }}>{selectedPlatforms.length}</span> platform{selectedPlatforms.length !== 1 ? 's' : ''} · under{' '}
                  <span style={{ color: C.accent, fontWeight: 700 }}>${budget}</span>
                  {sneakersSelected && selectedSizes.length > 0 && (
                    <> · sizes <span style={{ color: C.accent, fontWeight: 700 }}>{selectedSizes.join(', ')}</span></>
                  )}
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${credits > 0 ? 'rgba(240,180,41,0.2)' : 'rgba(255,107,107,0.25)'}`,
                borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 500, color: C.text2 }}>
                  {credits > 0 ? <><span style={{ color: C.accent, fontFamily: F.mono, fontWeight: 700 }}>{credits}</span> searches remaining</> : 'No searches — grab a plan below'}
                </span>
                {credits <= 0 && (
                  <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ fontFamily: F.display, fontSize: 12, fontWeight: 600, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Get credits →
                  </button>
                )}
              </div>

              {error && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.25)' }}>
                  <p style={{ fontFamily: F.display, fontSize: 13, color: C.danger }}>{error}</p>
                </div>
              )}

              <button onClick={handleSearch} disabled={loading || credits <= 0}
                style={{
                  position: 'relative', overflow: 'hidden', width: '100%', height: 58, borderRadius: 12, border: 'none',
                  cursor: loading || credits <= 0 ? 'not-allowed' : 'pointer',
                  fontFamily: F.display, fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
                  background: C.accent, color: C.bg,
                  opacity: credits <= 0 && !loading ? 0.4 : 1,
                  transition: 'filter 0.25s, box-shadow 0.25s',
                }}
                onMouseEnter={e => { if (!loading && credits > 0) { e.currentTarget.style.filter = 'brightness(1.05)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(240,180,41,0.35)' } }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                {loading && (
                  <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', animation: 'shimmer 1.4s linear infinite' }} />
                )}
                {loading ? (
                  <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                    <svg style={{ animation: 'spin 0.8s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontFamily: F.mono, fontSize: 13 }}>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                  </span>
                ) : 'Run Flip Scan →'}
              </button>

              {loading && (
                <p style={{ fontFamily: F.display, fontSize: 12, color: C.text3, textAlign: 'center' }}>
                  Takes 20–40s · scanning live data
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
