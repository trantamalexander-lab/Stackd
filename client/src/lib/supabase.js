import { createClient } from '@supabase/supabase-js'

// Values come from client/.env (VITE_ vars get baked into the app build).
// The anon key is safe to ship in the client — the service_role key never lives here.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (url && anonKey)
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null   // null until env is configured, so the app still builds/runs

// Absolute backend URL for the native app (relative /api won't work in a WebView).
// Falls back to same-origin for the web build.
export const API_BASE = import.meta.env.VITE_API_BASE || ''
