import { useState } from 'react'
import { motion } from 'framer-motion'
import { authApi } from '../lib/useAuth'
import StackdLogo from '../components/StackdLogo'
import { C, F } from '../theme'

export default function LoginScreen({ onDone }) {
  const [mode, setMode] = useState('login')       // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setNotice(null); setLoading(true)
    try {
      const fn = mode === 'signup' ? authApi.signUp : authApi.signIn
      const { data, error } = await fn(email.trim(), password)
      if (error) throw error
      if (mode === 'signup' && !data.session) {
        setNotice('Check your email to confirm your account, then log in.')
      } else {
        onDone?.()
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const input = {
    width: '100%', height: 50, padding: '0 16px', borderRadius: 11, marginBottom: 12,
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.panelBorder}`,
    color: C.text, fontFamily: F.display, fontSize: 15, outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <StackdLogo size={44} />
          <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26, color: C.text, margin: '16px 0 6px', letterSpacing: '-0.02em' }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ fontFamily: F.display, fontSize: 14, color: C.text3 }}>
            {mode === 'signup' ? 'Start finding flips worth making.' : 'Log in to keep flipping.'}
          </p>
        </div>

        <form onSubmit={submit}>
          <input style={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input style={input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} />

          {error && <p style={{ fontFamily: F.display, fontSize: 13, color: C.danger, margin: '4px 0 12px' }}>{error}</p>}
          {notice && <p style={{ fontFamily: F.display, fontSize: 13, color: C.accent, margin: '4px 0 12px' }}>{notice}</p>}

          <button type="submit" disabled={loading}
            style={{ width: '100%', height: 50, borderRadius: 11, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: C.accent, color: C.bg, fontFamily: F.display, fontWeight: 700, fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontFamily: F.display, fontSize: 13.5, color: C.text3, marginTop: 20 }}>
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); setNotice(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, fontFamily: F.display, fontSize: 13.5, fontWeight: 600 }}>
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
