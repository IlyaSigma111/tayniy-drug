import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="logo">Тайный друг</Link>
        <div className="header-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-primary">Личный кабинет</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn">Войти</Link>
              <Link to="/register" className="btn btn-primary">Регистрация</Link>
            </>
          )}
        </div>
      </header>

      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 560 }}>
          <h1 className="card-title" style={{ fontSize: 28, marginBottom: 16 }}>Письмо от тайного друга</h1>
          <p style={{ color: 'var(--text-body)', lineHeight: 1.7, marginBottom: 16, fontSize: 15 }}>
            Анонимный обмен тёплыми письмами-мотиваторами между участниками.
            Заполни анкету, получи случайного друга и напиши ему анонимное письмо с поддержкой.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            {!user && (
              <>
                <Link to="/register" className="btn btn-primary">Присоединиться</Link>
                <Link to="/login" className="btn">Войти</Link>
              </>
            )}
            {user && (
              <Link to="/dashboard" className="btn btn-primary">В личный кабинет</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
