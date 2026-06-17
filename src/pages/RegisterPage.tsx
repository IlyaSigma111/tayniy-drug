import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password.length < 6) { setError('Пароль должен быть минимум 6 символов'); return }
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    setLoading(true)
    try {
      const cred = await register(email, password)
      await setDoc(doc(db, 'credentials', cred.user.uid), {
        email,
        password,
        createdAt: new Date().toISOString(),
      })
      setSuccess('Регистрация успешна! Проверьте email и подтвердите его, затем войдите.')
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации')
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
          <h1 className="card-title">Регистрация</h1>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="form-group">
              <label>Пароль</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="минимум 6 символов" required />
            </div>
            <div className="form-group">
              <label>Подтвердите пароль</label>
              <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="повторите пароль" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
          <div className="auth-links">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
