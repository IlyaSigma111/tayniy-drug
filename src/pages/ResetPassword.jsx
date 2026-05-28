import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('Пользователь с таким email не найден');
      } else {
        setError('Ошибка отправки письма. Проверьте email.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="logo">Восстановление пароля</h1>
        {error && <div className="error-message">{error}</div>}
        {success ? (
          <div className="success-message" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>Письмо для восстановления пароля отправлено на {email}</p>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Вернуться к входу
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Отправка...' : 'Отправить письмо'}
              </button>
            </form>
            <div className="auth-links">
              <Link to="/login">Назад к входу</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
