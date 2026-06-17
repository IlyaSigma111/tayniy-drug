import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, doc, setDoc, writeBatch, Timestamp, getDoc } from 'firebase/firestore'
import { db, API_KEY } from '../lib/firebase'

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

  const fileRef = useRef<HTMLInputElement>(null)

  function serializeTimestamps(data: any): any {
    const result: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Timestamp) {
        result[key] = { _seconds: value.seconds, _nanoseconds: value.nanoseconds }
      } else if (Array.isArray(value)) {
        result[key] = value.map(v => (v !== null && typeof v === 'object' ? serializeTimestamps(v) : v))
      } else if (value !== null && typeof value === 'object') {
        result[key] = serializeTimestamps(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  function deserializeTimestamps(data: any): any {
    const result: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
        result[key] = new Timestamp(value._seconds, value._nanoseconds)
      } else if (Array.isArray(value)) {
        result[key] = value.map(v => (v !== null && typeof v === 'object' ? deserializeTimestamps(v) : v))
      } else if (value !== null && typeof value === 'object') {
        result[key] = deserializeTimestamps(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  async function handleExport() {
    setMsg('')
    try {
      const profSnap = await getDocs(collection(db, 'profiles'))
      const profilesData: any[] = []
      profSnap.forEach(d => profilesData.push({ id: d.id, ...serializeTimestamps(d.data()) }))

      const assignSnap = await getDocs(collection(db, 'assignments'))
      const assignmentsData: any[] = []
      assignSnap.forEach(d => assignmentsData.push({ id: d.id, ...serializeTimestamps(d.data()) }))

      const lettersSnap = await getDocs(collection(db, 'letters'))
      const lettersData: any[] = []
      lettersSnap.forEach(d => lettersData.push({ id: d.id, ...serializeTimestamps(d.data()) }))

      const credSnap = await getDocs(collection(db, 'credentials'))
      const credentialsData: any[] = []
      credSnap.forEach(d => credentialsData.push({ id: d.id, ...serializeTimestamps(d.data()) }))

      const distSnap = await getDoc(doc(db, 'settings', 'distribution'))
      const distributionData = distSnap.exists() ? serializeTimestamps(distSnap.data()) : null

      const exportData = {
        exportedAt: new Date().toISOString(),
        profiles: profilesData,
        assignments: assignmentsData,
        letters: lettersData,
        credentials: credentialsData,
        distribution: distributionData,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tayniy-drug-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMsg(`Экспортировано: ${profilesData.length} анкет, ${assignmentsData.length} назначений, ${lettersData.length} писем, ${credentialsData.length} учётных записей`)
    } catch (err: any) {
      setMsg(err.message || 'Ошибка экспорта')
    }
  }

  async function handleImport(file: File) {
    if (!confirm('Импорт перезапишет все данные в Firestore и создаст пользователей в Firebase Auth. Продолжить?')) return

    setMsg('')
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.profiles) { setMsg('Неверный формат: нет profiles'); return }

      // Phase 1: Create auth users via REST API and build UID mapping
      const uidMap: Record<string, string> = {}
      if (data.credentials?.length > 0) {
        for (const c of data.credentials) {
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: c.email, password: c.password, returnSecureToken: true }),
          })
          const result = await res.json()
          if (result.error) {
            if (result.error.message === 'EMAIL_EXISTS') {
              // User might already exist, try signIn to get localId
              const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: c.email, password: c.password, returnSecureToken: true }),
              })
              const signInData = await signInRes.json()
              if (signInData.localId) uidMap[c.id] = signInData.localId
              else throw new Error(`Не удалось получить UID для ${c.email}`)
            } else {
              throw new Error(result.error.message)
            }
          } else {
            uidMap[c.id] = result.localId
          }
        }
      }

      // Phase 2: Write profiles with remapped IDs
      if (data.profiles.length > 0) {
        let batch = writeBatch(db)
        let count = 0
        for (const p of data.profiles) {
          const newId = uidMap[p.id] || p.id
          const ref = doc(db, 'profiles', newId)
          const clean = deserializeTimestamps(p)
          delete clean.id
          batch.set(ref, clean)
          count++
          if (count % 500 === 0) { await batch.commit(); batch = writeBatch(db) }
        }
        await batch.commit()
      }

      // Phase 3: Write assignments with remapped IDs
      if (data.assignments?.length > 0) {
        let batch = writeBatch(db)
        let count = 0
        for (const a of data.assignments) {
          const newUserId = uidMap[a.id] || a.id
          const ref = doc(db, 'assignments', newUserId)
          const clean = deserializeTimestamps(a)
          delete clean.id
          if (clean.assignedTo) clean.assignedTo = uidMap[clean.assignedTo] || clean.assignedTo
          batch.set(ref, clean)
          count++
          if (count % 500 === 0) { await batch.commit(); batch = writeBatch(db) }
        }
        await batch.commit()
      }

      // Phase 4: Write letters with remapped user IDs
      if (data.letters?.length > 0) {
        let batch = writeBatch(db)
        let count = 0
        for (const l of data.letters) {
          const ref = doc(db, 'letters', l.id)
          const clean = deserializeTimestamps(l)
          delete clean.id
          if (clean.fromId) clean.fromId = uidMap[clean.fromId] || clean.fromId
          if (clean.toId) clean.toId = uidMap[clean.toId] || clean.toId
          batch.set(ref, clean)
          count++
          if (count % 500 === 0) { await batch.commit(); batch = writeBatch(db) }
        }
        await batch.commit()
      }

      // Phase 5: Write distribution settings
      if (data.distribution) {
        const ref = doc(db, 'settings', 'distribution')
        const clean = deserializeTimestamps(data.distribution)
        await setDoc(ref, clean)
      }

      const authCount = Object.keys(uidMap).length
      setMsg(`Импорт завершён! Создано/найдено ${authCount} пользователей, загружены анкеты, назначения, письма.`)
      await loadData()
    } catch (err: any) {
      setMsg(err.message || 'Ошибка импорта: ' + err.message)
    }
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
          <button className="btn" style={{ fontSize: 13 }} onClick={() => loadData()} disabled={loading}>Обновить</button>
          <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }}>Выйти</button>
        </div>
      </header>

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
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={handleExport} disabled={loading}>
                Экспорт данных
              </button>
              <label className="btn" style={{ cursor: 'pointer' }}>
                Импорт данных
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                  e.target.value = ''
                }} />
              </label>
            </div>
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
