import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  collection, getDocs, doc, getDoc, setDoc, writeBatch, Timestamp
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

interface UserProfile {
  id: string
  email: string
  fullName: string
  region: string
  bio: string
  photoUrl: string
  createdAt: Timestamp | null
}

interface Assignment {
  userId: string
  assignedTo: string
  assignedToName: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)
  const [msg, setMsg] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const checkAdmin = useCallback(async () => {
    if (!user) return
    const ref = doc(db, 'admins', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      navigate('/dashboard')
    } else {
      setIsAdmin(true)
    }
  }, [user, navigate])

  useEffect(() => {
    checkAdmin()
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    try {
      // Load all profiles
      const profSnap = await getDocs(collection(db, 'profiles'))
      const profileList: UserProfile[] = []
      profSnap.forEach(d => {
        profileList.push({ id: d.id, ...d.data() } as UserProfile)
      })
      setUsers(profileList)

      // Load assignments
      const assignSnap = await getDocs(collection(db, 'assignments'))
      const assignList: Assignment[] = []
      assignSnap.forEach(d => {
        assignList.push({ userId: d.id, ...d.data() } as Assignment)
      })
      // Fill names
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
      // Fisher-Yates shuffle
      const shuffled = [...ids]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }

      // Create pairs ensuring no self-assignment and no mutual assignments
      // Simple approach: shift by 1
      const pairs: { from: string; to: string }[] = []
      for (let i = 0; i < shuffled.length; i++) {
        const from = shuffled[i]
        const to = shuffled[(i + 1) % shuffled.length]
        pairs.push({ from, to })
      }

      // Verify no mutual assignments (A->B and B->A)
      // This simple shift approach guarantees no mutual pairs and no self-assignment
      const pairSet = new Set(pairs.map(p => `${p.from}-${p.to}`))
      let hasMutual = false
      for (const p of pairs) {
        if (pairSet.has(`${p.to}-${p.from}`)) { hasMutual = true; break }
      }

      if (hasMutual) {
        setMsg('Обнаружены взаимные назначения, перезапустите распределение')
        setDistributing(false)
        return
      }

      // Save assignments
      const batch = writeBatch(db)
      for (const p of pairs) {
        const ref = doc(db, 'assignments', p.from)
        batch.set(ref, {
          assignedTo: p.to,
          createdAt: Timestamp.now(),
        })
      }
      await batch.commit()

      // Set distribution flag
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

  async function handleLogout() {
    await signOut(auth)
    navigate('/')
  }

  if (!isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Проверка доступа...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="logo">Тайный друг</Link>
        <div className="header-actions">
          <Link to="/dashboard" className="btn" style={{ fontSize: 13 }}>Кабинет</Link>
          <span style={{ fontSize: 12, color: 'var(--warning)' }}>Админ</span>
          <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <div className="container">
        {msg && (
          <div className={`alert ${msg.includes('Ошибка') ? 'alert-error' : 'alert-success'}`}>{msg}</div>
        )}

        <div className="dashboard-grid">
          {/* Admin Panel */}
          <div className="card">
            <div className="section-header">
              <h2 className="card-title" style={{ margin: 0 }}>Админ-панель</h2>
              <button className="btn" style={{ fontSize: 13 }} onClick={loadData} disabled={loading}>
                {loading ? '...' : 'Обновить'}
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              Всего участников с анкетами: <strong style={{ color: 'var(--accent)' }}>{users.length}</strong>
            </p>
            {assignments.length === 0 ? (
              <button className="btn btn-primary" onClick={runDistribution} disabled={distributing || users.length < 2}>
                {distributing ? 'Распределение...' : 'Запустить распределение'}
              </button>
            ) : (
              <div className="alert alert-info">
                Распределение уже выполнено ({assignments.length} участников распределено).
                <br />
                <button className="btn" style={{ fontSize: 13, marginTop: 8 }} onClick={runDistribution} disabled={distributing}>
                  Перераспределить
                </button>
              </div>
            )}
          </div>

          {/* Users List */}
          <div className="card">
            <h2 className="card-title">Участники ({users.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--accent-border)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>ФИО</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Регион</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Назначен</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const assigned = assignments.find(a => a.userId === u.id)
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--accent-border)' }}>
                        <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>{u.fullName}</td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{u.region || '—'}</td>
                        <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: 12 }}>{u.id}</td>
                        <td style={{ padding: '10px', color: 'var(--accent)' }}>{assigned ? assigned.assignedToName : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assignments Table */}
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
                      const fromUser = users.find(u => u.id === a.userId)
                      return (
                        <tr key={a.userId} style={{ borderBottom: '1px solid var(--accent-border)' }}>
                          <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>{fromUser?.fullName || 'Неизвестно'}</td>
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
