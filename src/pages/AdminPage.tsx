import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

const ADMIN_PASSWORD = 'мухоморпоганка'

interface UserProfile {
  id: string
  fullName: string
  region: string
  bio: string
}

interface Assignment {
  userId: string
  assignedTo: string
  assignedToName: string
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === 'true')
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')

  const [users, setUsers] = useState<UserProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)
  const [msg, setMsg] = useState('')

  const THEMES = [
    { id: 'blue', label: 'Синий' },
    { id: 'red', label: 'Красный' },
    { id: 'green', label: 'Зелёный' },
    { id: 'white', label: 'Белый' },
    { id: 'purple', label: 'Фиолетовый' },
    { id: 'orange', label: 'Оранжевый' },
    { id: 'cyan', label: 'Голубой' },
    { id: 'gold', label: 'Золотой' },
    { id: 'pink', label: 'Розовый' },
    { id: 'teal', label: 'Бирюзовый' },
    { id: 'lilac', label: 'Лиловый' },
    { id: 'slate', label: 'Серый' },
    { id: 'amber', label: 'Янтарный' },
    { id: 'glass', label: 'Стекло' },
    { id: 'victory', label: 'Победа' },
  ]

  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('app-theme') || 'blue')
  const [themeOpen, setThemeOpen] = useState(false)

  function changeTheme(themeId: string) {
    setCurrentTheme(themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    localStorage.setItem('app-theme', themeId)
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true')
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('Неверный пароль')
    }
  }

  useEffect(() => {
    if (authed) loadData()
  }, [authed])

  useEffect(() => {
    const saved = localStorage.getItem('app-theme')
    if (saved) {
      setCurrentTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const profSnap = await getDocs(collection(db, 'profiles'))
      const profileList: UserProfile[] = []
      profSnap.forEach(d => profileList.push({ id: d.id, ...d.data() } as UserProfile))
      setUsers(profileList)

      const assignSnap = await getDocs(collection(db, 'assignments'))
      const assignList: Assignment[] = []
      assignSnap.forEach(d => {
        assignList.push({ userId: d.id, ...d.data() } as Assignment)
      })
      for (const a of assignList) {
        const prof = profileList.find(p => p.id === a.assignedTo)
        a.assignedToName = prof?.fullName || 'Неизвестно'
      }
      setAssignments(assignList)
    } catch (err: any) {
      setMsg(err.message || 'Ошибка загрузки')
    }
    setLoading(false)
  }

  async function runDistribution() {
    if (users.length < 2) { setMsg('Нужно минимум 2 участника с анкетами'); return }
    setDistributing(true)
    setMsg('')
    try {
      const ids = users.map(u => u.id)
      const shuffled = [...ids]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }

      const pairs: { from: string; to: string }[] = []
      for (let i = 0; i < shuffled.length; i++) {
        pairs.push({ from: shuffled[i], to: shuffled[(i + 1) % shuffled.length] })
      }

      const batch = writeBatch(db)
      for (const p of pairs) {
        const ref = doc(db, 'assignments', p.from)
        batch.set(ref, { assignedTo: p.to, createdAt: Timestamp.now() })
      }
      await batch.commit()

      await setDoc(doc(db, 'settings', 'distribution'), {
        done: true,
        date: Timestamp.now(),
      })

      setMsg(`Распределение завершено! ${pairs.length} пар создано.`)
      await loadData()
    } catch (err: any) {
      setMsg(err.message || 'Ошибка распределения')
    }
    setDistributing(false)
  }

  if (!authed) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: 380 }}>
          <h1 className="card-title">Админ-панель</h1>
          {pwError && <div className="alert alert-error">{pwError}</div>}
          <div className="form-group">
            <label>Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Введите пароль"
              autoFocus
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogin}>
            Войти
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <span className="logo">Тайный друг — Админ</span>
        <div className="header-actions">
          <button className="btn" style={{ fontSize: 13 }} onClick={() => setThemeOpen(o => !o)}>🎨</button>
          <button className="btn" style={{ fontSize: 13 }} onClick={() => loadData()} disabled={loading}>Обновить</button>
          <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }}>Выйти</button>
        </div>
      </header>

      {themeOpen && (
        <div style={{
          position: 'fixed', top: 64, right: 20, zIndex: 99,
          background: 'var(--bg-card)', border: '1px solid var(--accent-border)',
          borderRadius: 16, padding: 20, width: 260,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{color:'var(--accent)',fontWeight:700,fontSize:15}}>Тема оформления</span>
            <button onClick={()=>setThemeOpen(false)} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:20,cursor:'pointer'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {THEMES.map(t => (
              <button key={t.id} onClick={()=>changeTheme(t.id)}
                style={{
                  padding:'8px 4px', borderRadius:8, border: currentTheme===t.id ? '2px solid var(--accent)' : '2px solid var(--accent-border)',
                  background: currentTheme===t.id ? 'var(--accent-mid)' : 'transparent',
                  color: 'var(--text-body)', fontSize:12, fontWeight:500, cursor:'pointer',
                  transition:'all 0.2s'
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="container">
        {msg && (
          <div className={`alert ${msg.includes('Ошибка') ? 'alert-error' : 'alert-success'}`}>{msg}</div>
        )}

        <div className="dashboard-grid">
          <div className="card">
            <div className="section-header">
              <h2 className="card-title" style={{ margin: 0 }}>Управление</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Участников с анкетами: <strong style={{ color: 'var(--accent)' }}>{users.length}</strong>
            </p>
            {assignments.length === 0 ? (
              <button className="btn btn-primary" onClick={runDistribution} disabled={distributing || users.length < 2}>
                {distributing ? 'Распределение...' : 'Запустить распределение'}
              </button>
            ) : (
              <div className="alert alert-info">
                Распределение выполнено ({assignments.length} участников).
                <br />
                <button className="btn" style={{ fontSize: 13, marginTop: 8 }} onClick={runDistribution} disabled={distributing}>
                  Перераспределить
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">Участники ({users.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--accent-border)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>ФИО</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Регион</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>UID</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Назначен</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const a = assignments.find(x => x.userId === u.id)
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--accent-border)' }}>
                        <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>{u.fullName}</td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{u.region || '—'}</td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: 12 }}>{u.id.slice(0, 12)}...</td>
                        <td style={{ padding: '10px', color: 'var(--accent)' }}>{a ? a.assignedToName : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="card">
              <h2 className="card-title">Назначения</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--accent-border)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>От кого</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>→ Кому</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => {
                      const from = users.find(u => u.id === a.userId)
                      return (
                        <tr key={a.userId} style={{ borderBottom: '1px solid var(--accent-border)' }}>
                          <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>{from?.fullName || 'Неизвестно'}</td>
                          <td style={{ padding: '10px', color: 'var(--accent)' }}>{a.assignedToName}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
