import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './styles/global.css'

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
    <BrowserRouter basename="/tayniy-drug">
      <RedirectHandler>
        <AuthProvider>
          <App />
        </AuthProvider>
      </RedirectHandler>
    </BrowserRouter>
  </StrictMode>,
)
