import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthScreen from './pages/AuthScreen'
import Dashboard from './pages/Dashboard'
import './styles/tokens.css'

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="splash">
        <span className="splash__mark">◐</span>
      </div>
    )
  }

  return user ? <Dashboard /> : <AuthScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
