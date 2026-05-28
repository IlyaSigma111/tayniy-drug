import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../styles/App.css';

const ADMIN_PASSWORD = 'мухоморпоганка';

const AdminPanel = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [letters, setLetters] = useState([]);
  const [distributionStatus, setDistributionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningDistribution, setRunningDistribution] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(
    sessionStorage.getItem('admin_auth') === 'true'
  );

  useEffect(() => {
    if (authenticated) loadData();
    else setLoading(false);
  }, [authenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      setAuthenticated(true);
      setPassword('');
      loadData();
    } else {
      setMessage('Неверный пароль');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, lettersSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'letters'))
      ]);

      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const lettersList = lettersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setUsers(usersList);
      setLetters(lettersList);

      const completedProfiles = usersList.filter(u => u.profileCompleted);
      const assignedUsers = usersList.filter(u => u.assignedTo);

      setDistributionStatus({
        totalUsers: usersList.length,
        completedProfiles: completedProfiles.length,
        assigned: assignedUsers.length,
        totalLetters: lettersList.length
      });
    } catch (err) {
      setMessage('Ошибка загрузки данных: ' + err.message);
    }
    setLoading(false);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const hasMutualPairs = (shuffled) => {
    for (let i = 0; i < shuffled.length; i++) {
      const giver = shuffled[i];
      const receiver = shuffled[(i + 1) % shuffled.length];
      for (let j = 0; j < shuffled.length; j++) {
        if (shuffled[j].id === receiver.id) {
          const receiverTarget = shuffled[(j + 1) % shuffled.length];
          if (receiverTarget.id === giver.id) return true;
        }
      }
    }
    return false;
  };

  const runDistribution = async () => {
    const toAssign = users.filter(u => u.profileCompleted);
    if (toAssign.length < 2) {
      setMessage('Недостаточно участников для распределения (минимум 2)');
      return;
    }

    if (toAssign.length === 2) {
      const canDirect = window.confirm(
        'Всего 2 участника. Это создаст взаимное назначение (A↔B). Продолжить?'
      );
      if (!canDirect) return;
    }

    setRunningDistribution(true);
    setMessage('');

    try {
      let shuffled;
      let attempts = 0;
      do {
        shuffled = shuffleArray(toAssign);
        attempts++;
      } while (hasMutualPairs(shuffled) && attempts < 50);

      const updates = [];
      for (let i = 0; i < shuffled.length; i++) {
        const giver = shuffled[i];
        const receiver = shuffled[(i + 1) % shuffled.length];
        updates.push(
          updateDoc(doc(db, 'users', giver.id), {
            assignedTo: receiver.id,
            distributionLocked: true
          })
        );
      }

      await Promise.all(updates);
      setMessage(`Распределение выполнено! Назначено ${shuffled.length} пар.`);
      loadData();
    } catch (err) {
      setMessage('Ошибка распределения: ' + err.message);
    }
    setRunningDistribution(false);
  };

  const resetDistribution = async () => {
    if (!window.confirm('Вы уверены? Это сбросит все назначения!')) return;
    setMessage('');
    try {
      const updates = users
        .filter(u => u.assignedTo)
        .map(u => updateDoc(doc(db, 'users', u.id), {
          assignedTo: null,
          distributionLocked: false
        }));
      await Promise.all(updates);
      setMessage('Распределение сброшено');
      loadData();
    } catch (err) {
      setMessage('Ошибка сброса: ' + err.message);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  if (!authenticated) {
    return (
      <div className="page-content">
        <h1 style={{ color: '#e2e8f0', marginBottom: 24 }}>Административная панель</h1>
        <form onSubmit={handlePasswordSubmit} className="password-form">
          <h2>Введите пароль</h2>
          {message && <div className="error-message">{message}</div>}
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setMessage(''); }}
              placeholder="Пароль администратора"
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary">Войти</button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-content">
      <h1 style={{ color: '#e2e8f0', marginBottom: 24 }}>Административная панель</h1>

      {message && (
        <div className={message.includes('Ошибка') || message.includes('Неверный') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Всего пользователей</h3>
          <p className="stat-number">{distributionStatus?.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Заполнили анкету</h3>
          <p className="stat-number">{distributionStatus?.completedProfiles}</p>
        </div>
        <div className="stat-card">
          <h3>Распределено</h3>
          <p className="stat-number">{distributionStatus?.assigned}</p>
        </div>
        <div className="stat-card">
          <h3>Писем отправлено</h3>
          <p className="stat-number">{distributionStatus?.totalLetters}</p>
        </div>
      </div>

      <div className="admin-actions">
        <button
          onClick={runDistribution}
          className="btn-primary"
          disabled={runningDistribution}
        >
          {runningDistribution ? 'Распределение...' : 'Запустить распределение'}
        </button>
        <button onClick={resetDistribution} className="btn-danger">
          Сбросить распределение
        </button>
      </div>

      <div className="users-table-container">
        <h2>Все пользователи</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Регион</th>
              <th>Анкета</th>
              <th>Назначен</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.region || '-'}</td>
                <td>{user.profileCompleted ? '✓' : '✗'}</td>
                <td>{user.assignedTo ? '✓' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
