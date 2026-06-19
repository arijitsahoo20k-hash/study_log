import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import './AuthScreen.css'

export default function AuthScreen() {
  const { signInWithPassword, signUp, signInWithMagicLink, authError } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup | magic
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setMagicSent(false)
    if (mode === 'magic') {
      const ok = await signInWithMagicLink(email)
      if (ok) setMagicSent(true)
    } else if (mode === 'signup') {
      await signUp(email, password)
    } else {
      await signInWithPassword(email, password)
    }
    setSubmitting(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-mark" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="3" y="8" width="34" height="26" rx="3" stroke="var(--amber-500)" strokeWidth="2"/>
            <circle cx="20" cy="21" r="7" stroke="var(--amber-500)" strokeWidth="2"/>
            <rect x="13" y="4" width="8" height="5" rx="1" fill="var(--amber-500)"/>
          </svg>
        </div>
        <h1 className="auth-title">studylog</h1>
        <p className="auth-subtitle">A daily photograph of how you showed up.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
            />
          </label>

          {mode !== 'magic' && (
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>
          )}

          {authError && <p className="auth-error">{authError}</p>}
          {magicSent && (
            <p className="auth-success">Check your inbox — we sent a sign-in link to {email}.</p>
          )}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? 'Working…'
              : mode === 'signup'
              ? 'Create account'
              : mode === 'magic'
              ? 'Send magic link'
              : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'signin' && (
            <>
              <button onClick={() => setMode('signup')}>Create an account</button>
              <span aria-hidden="true">·</span>
              <button onClick={() => setMode('magic')}>Use a magic link instead</button>
            </>
          )}
          {mode === 'signup' && <button onClick={() => setMode('signin')}>Already have an account? Sign in</button>}
          {mode === 'magic' && <button onClick={() => setMode('signin')}>Use password instead</button>}
        </div>
      </div>

      <p className="auth-privacy-note">
        Your photographs are stored privately and are never public. Only you can view them.
      </p>
    </div>
  )
}
