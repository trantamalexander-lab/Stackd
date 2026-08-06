import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import { AuthProvider, useAuth } from './lib/useAuth'

// Decide what to show: nothing while checking, login if signed out, app if signed in.
function Root() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', background: '#0A0A0A' }} />
  return user ? <App /> : <LoginScreen />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
