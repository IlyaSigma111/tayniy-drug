import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './styles/global.css'
import './styles/themes.css'

function RedirectHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  useEffect(() => {
    const saved = sessionStorage.getItem('redirect')
    if (saved && saved !== '/') {
      sessionStorage.removeItem('redirect')
      navigate(saved, { replace: true })
    }
  }, [])
  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <RedirectHandler>
        <AuthProvider>
          <App />
        </AuthProvider>
      </RedirectHandler>
    </HashRouter>
  </StrictMode>,
)
