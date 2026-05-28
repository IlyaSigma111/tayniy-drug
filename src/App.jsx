import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import './styles/App.css';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (!currentUser.emailVerified) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="logo">Подтвердите email</h1>
          <p style={{ textAlign: 'center', marginBottom: 16, color: '#94a3b8' }}>
            Пожалуйста, подтвердите ваш email. Проверьте почту и нажмите на ссылку в письме.
          </p>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            После подтверждения <a href="/" onClick={(e) => { e.preventDefault(); window.location.reload(); }} style={{ color: '#4169e1' }}>обновите страницу</a>.
          </p>
        </div>
      </div>
    );
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser?.emailVerified ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
