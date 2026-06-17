import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email)
      navigate('/dashboard')
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        try {
          await register(email)
          navigate('/dashboard')
        } catch (regErr: any) {
          setError(regErr.message || 'Ошибка регистрации')
        }
      } else {
        setError(err.message || 'Ошибка входа')
      }
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="logo">Тайный друг</Link>
      </header>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: 420 }}>
          <h1 className="card-title">Войти</h1>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoFocus />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
          <div className="auth-links" style={{ marginTop: 16 }}>
            Нет аккаунта? Он создастся автоматически при входе
          </div>
        </div>
      </div>
    </div>
  )
}
