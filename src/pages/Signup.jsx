import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Пароли не совпадают');
    }
    if (password.length < 6) {
      return setError('Пароль должен содержать минимум 6 символов');
    }

    setLoading(true);
    try {
      await signup(email, password, fullName);
      setSuccess(true);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Этот email уже зарегистрирован');
      } else {
        setError('Ошибка регистрации. Попробуйте позже.');
      }
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card success">
          <h1>Регистрация успешна!</h1>
          <p style={{ color: '#94a3b8', marginBottom: 8 }}>
            Проверьте вашу почту для подтверждения email.
          </p>
          <p style={{ color: '#94a3b8', marginBottom: 16 }}>
            После подтверждения войдите в систему.
          </p>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            Перейти к входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="logo">Регистрация</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ФИО</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Подтвердите пароль</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Уже есть аккаунт? Войти</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
