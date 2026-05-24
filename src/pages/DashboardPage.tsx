import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  doc, getDoc, setDoc, updateDoc, collection, query,
  where, addDoc, orderBy, serverTimestamp, Timestamp, onSnapshot
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

interface Profile {
  fullName: string
  region: string
  bio: string
  photoUrl: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

interface AssignedUser {
  id: string
  fullName: string
  region: string
  bio: string
  photoUrl: string
}

interface Letter {
  id: string
  fromId: string
  toId: string
  text: string
  attachments: string[]
  createdAt: Timestamp | null
  read: boolean
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Profile form
  const [fullName, setFullName] = useState('')
  const [region, setRegion] = useState('')
  const [bio, setBio] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  // Distribution status
  const [distributionDone, setDistributionDone] = useState(false)
  const [assignedUser, setAssignedUser] = useState<AssignedUser | null>(null)

  // Letters
  const [inbox, setInbox] = useState<Letter[]>([])
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null)
  const [composing, setComposing] = useState(false)
  const [letterText, setLetterText] = useState('')
  const [attachments, setAttachments] = useState<string[]>([''])
  const [sendingLetter, setSendingLetter] = useState(false)

  useEffect(() => {
    if (!user) return
    loadProfile()
    listenInbox()
  }, [user])

  async function loadProfile() {
    if (!user) return
    setLoading(true)
    const ref = doc(db, 'profiles', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const p = snap.data() as Profile
      setProfile(p)
      setFullName(p.fullName || '')
      setRegion(p.region || '')
      setBio(p.bio || '')
      setPhotoUrl(p.photoUrl || '')
    }
    // Check distribution
    const distRef = doc(db, 'assignments', user.uid)
    const distSnap = await getDoc(distRef)
    if (distSnap.exists()) {
      setDistributionDone(true)
      const assignedId = distSnap.data().assignedTo
      if (assignedId) {
        const pRef = doc(db, 'profiles', assignedId)
        const pSnap = await getDoc(pRef)
        if (pSnap.exists()) {
          const ap = pSnap.data() as Profile
          setAssignedUser({ id: assignedId, ...ap })
        }
      }
    }
    setLoading(false)
  }

  function listenInbox() {
    if (!user) return
    const q = query(collection(db, 'letters'), where('toId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list: Letter[] = []
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Letter))
      setInbox(list)
    })
    return unsub
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!fullName.trim()) { setMsg('ФИО обязательно'); return }
    if (!bio.trim() || bio.length > 2000) { setMsg('Биография обязательна (до 2000 символов)'); return }
    setSaving(true)
    setMsg('')
    try {
      const ref = doc(db, 'profiles', user.uid)
      const data: Profile = {
        fullName: fullName.trim(),
        region: region.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl.trim(),
        createdAt: profile?.createdAt || serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      }
      await setDoc(ref, data, { merge: true })
      setProfile(data)
      setMsg('Анкета сохранена!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      setMsg(err.message || 'Ошибка сохранения')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/')
  }

  async function sendLetter() {
    if (!user || !assignedUser) return
    if (letterText.trim().length < 50) { setMsg('Минимум 50 символов в письме'); return }
    if (letterText.length > 10000) { setMsg('Максимум 10000 символов'); return }
    setSendingLetter(true)
    setMsg('')
    try {
      const validAttachments = attachments.filter(a => a.trim())
      await addDoc(collection(db, 'letters'), {
        fromId: user.uid,
        toId: assignedUser.id,
        text: letterText.trim(),
        attachments: validAttachments,
        createdAt: serverTimestamp(),
        read: false,
      })
      setLetterText('')
      setAttachments([''])
      setComposing(false)
      setMsg('Письмо отправлено!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      setMsg(err.message || 'Ошибка отправки')
    }
    setSendingLetter(false)
  }

  async function markRead(letter: Letter) {
    if (!letter.read) {
      await updateDoc(doc(db, 'letters', letter.id), { read: true })
    }
    setSelectedLetter(letter)
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="logo">Тайный друг</Link>
        <div className="header-actions">
          <Link to="/dashboard" className="btn" style={{ fontSize: 13 }}>Кабинет</Link>
          <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <div className="container">
        {msg && (
          <div className={`alert ${msg.includes('Ошибка') ? 'alert-error' : 'alert-success'}`}>{msg}</div>
        )}

        <div className="dashboard-grid">
          {/* Анкета */}
          <div className="card">
            <div className="section-header">
              <h2 className="card-title" style={{ margin: 0 }}>Моя анкета</h2>
              {profile && !distributionDone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Можно редактировать до распределения</span>}
              {distributionDone && <span style={{ fontSize: 12, color: 'var(--warning)' }}>Распределение завершено</span>}
            </div>
            {profile && distributionDone ? (
              <div>
                <p><strong style={{ color: 'var(--accent)' }}>ФИО:</strong> {profile.fullName}</p>
                {profile.region && <p><strong style={{ color: 'var(--accent)' }}>Регион:</strong> {profile.region}</p>}
                <p><strong style={{ color: 'var(--accent)' }}>Биография:</strong> {profile.bio}</p>
                {profile.photoUrl && <img src={profile.photoUrl} alt="" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', marginTop: 12, border: '2px solid var(--accent-border)' }} />}
              </div>
            ) : (
              <form onSubmit={saveProfile}>
                <div className="form-group">
                  <label className="required">ФИО</label>
                  <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" required />
                </div>
                <div className="form-group">
                  <label>Регион</label>
                  <input className="input" value={region} onChange={e => setRegion(e.target.value)} placeholder="г. Москва" />
                </div>
                <div className="form-group">
                  <label className="required">Краткая биография</label>
                  <textarea className="textarea" value={bio} onChange={e => { if (e.target.value.length <= 2000) setBio(e.target.value) }} placeholder="Расскажите о себе..." rows={4} required />
                  <div className={`char-counter ${bio.length > 2000 ? 'over' : ''}`}>{bio.length}/2000</div>
                </div>
                <div className="form-group">
                  <label>Фото (ссылка)</label>
                  <input className="input" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://example.com/photo.jpg" />
                </div>
                <button className="btn btn-primary" disabled={saving || distributionDone}>
                  {saving ? 'Сохранение...' : 'Сохранить анкету'}
                </button>
              </form>
            )}
          </div>

          {/* Назначенный получатель */}
          {distributionDone && assignedUser && (
            <div className="card">
              <h2 className="card-title">Твой тайный друг</h2>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {assignedUser.photoUrl && (
                  <img src={assignedUser.photoUrl} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-border)', flexShrink: 0 }} />
                )}
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{assignedUser.fullName}</p>
                  {assignedUser.region && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>Регион: {assignedUser.region}</p>}
                  <p style={{ color: 'var(--text-body)', fontSize: 14, lineHeight: 1.5 }}>{assignedUser.bio}</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                {!composing ? (
                  <button className="btn btn-primary" onClick={() => setComposing(true)}>Написать письмо</button>
                ) : (
                  <div className="card" style={{ padding: 0, border: 'none', boxShadow: 'none' }}>
                    <h3 style={{ color: 'var(--accent)', marginBottom: 12, fontSize: 16 }}>Новое письмо</h3>
                    <div className="form-group">
                      <label className="required">Текст письма (50-10000 символов)</label>
                      <textarea className="textarea" value={letterText} onChange={e => { if (e.target.value.length <= 10000) setLetterText(e.target.value) }} placeholder="Напишите тёплые слова поддержки..." rows={6} />
                      <div className={`char-counter ${letterText.length > 10000 ? 'over' : ''}`}>{letterText.length}/10000</div>
                    </div>
                    <div className="form-group">
                      <label>Ссылки на вложения (Яндекс.Диск)</label>
                      {attachments.map((url, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <input className="input" value={url} onChange={e => {
                            const next = [...attachments]
                            next[i] = e.target.value
                            setAttachments(next)
                          }} placeholder="https://disk.yandex.ru/..." />
                          {attachments.length > 1 && (
                            <button type="button" className="btn btn-danger" style={{ padding: '8px 12px' }} onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}>×</button>
                          )}
                        </div>
                      ))}
                      {attachments.length < 5 && (
                        <button type="button" className="btn" style={{ fontSize: 13, marginTop: 4 }} onClick={() => setAttachments([...attachments, ''])}>+ Добавить ссылку</button>
                      )}
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Вставьте ссылки на фото/видео с Яндекс.Диска. Не более 5 файлов.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={sendLetter} disabled={sendingLetter}>
                        {sendingLetter ? 'Отправка...' : 'Отправить анонимно'}
                      </button>
                      <button className="btn" onClick={() => { setComposing(false); setLetterText(''); setAttachments(['']) }}>Отмена</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {distributionDone && !assignedUser && (
            <div className="card">
              <div className="alert alert-info">Распределение выполнено, но вам никто не назначен. Обратитесь к администратору.</div>
            </div>
          )}

          {!distributionDone && profile && (
            <div className="card">
              <div className="alert alert-info">Ожидайте, пока администратор запустит распределение участников.</div>
            </div>
          )}

          {!profile && (
            <div className="card">
              <div className="alert alert-info">Сначала заполните анкету выше.</div>
            </div>
          )}

          {/* Входящие */}
          <div className="card">
            <div className="section-header">
              <h2 className="card-title" style={{ margin: 0 }}>Входящие ({inbox.length})</h2>
            </div>
            {inbox.length === 0 ? (
              <div className="alert alert-info" style={{ margin: 0 }}>Пока нет писем.</div>
            ) : (
              <div className="letter-list">
                {inbox.map(letter => (
                  <div key={letter.id} className={`letter-item ${!letter.read ? 'unread' : ''}`} onClick={() => markRead(letter)}>
                    <div className="letter-date">
                      {letter.createdAt?.toDate().toLocaleString('ru-RU') || 'Недавно'}
                    </div>
                    <div className="letter-preview">{letter.text}</div>
                    {letter.attachments?.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        {letter.attachments.length} вложени{letter.attachments.length === 1 ? 'е' : 'я'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Просмотр письма */}
          {selectedLetter && (
            <div className="card">
              <div className="section-header">
                <h2 className="card-title" style={{ margin: 0 }}>Письмо</h2>
                <button className="btn" style={{ fontSize: 13 }} onClick={() => setSelectedLetter(null)}>Закрыть</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {selectedLetter.createdAt?.toDate().toLocaleString('ru-RU') || ''}
              </p>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-body)', fontSize: 15, marginBottom: 16 }}>{selectedLetter.text}</div>
              {selectedLetter.attachments?.length > 0 && (
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontSize: 14 }}>Вложения:</p>
                  <div className="attachment-list">
                    {selectedLetter.attachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                        {url.match(/\.(mp4|mov)$/i) ? '🎬 Видео' : url.match(/\.(jpg|jpeg|png|gif)$/i) ? '📷 Фото' : '📎 Файл'} {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
