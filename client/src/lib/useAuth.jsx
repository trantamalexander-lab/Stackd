import { useEffect, useState, createContext, useContext } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({ session: null, user: null, profile: null, loading: true })

// Wrap the app once; exposes the logged-in user + their subscription profile.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load the user's subscription row whenever they log in/out.
  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return }
    supabase.from('profiles').select('plan,status,current_period_end').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data || null))
  }, [session?.user?.id])

  const isPro = profile?.status === 'active' && (profile?.plan === 'pro' || profile?.plan === 'premium')

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, profile, isPro, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// Auth actions (email/password for launch; Apple/Google added once accounts exist).
export const authApi = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  reset:  (email) => supabase.auth.resetPasswordForEmail(email),
}
