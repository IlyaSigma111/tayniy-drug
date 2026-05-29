export interface AvatarOption {
  id: number
  emoji: string
  bg: string
  label: string
}

const COLORS = [
  { bg: 'linear-gradient(135deg, #4169e1, #6a5acd)', label: 'Синий' },
  { bg: 'linear-gradient(135deg, #ff4757, #ff6b81)', label: 'Красный' },
  { bg: 'linear-gradient(135deg, #2ecc71, #27ae60)', label: 'Зелёный' },
  { bg: 'linear-gradient(135deg, #f1f2f6, #dfe4ea)', label: 'Белый' },
  { bg: 'linear-gradient(135deg, #a855f7, #7c3aed)', label: 'Фиолетовый' },
  { bg: 'linear-gradient(135deg, #f97316, #ea580c)', label: 'Оранжевый' },
  { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', label: 'Голубой' },
  { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Золотой' },
  { bg: 'linear-gradient(135deg, #ec4899, #db2777)', label: 'Розовый' },
  { bg: 'linear-gradient(135deg, #14b8a6, #0d9488)', label: 'Бирюзовый' },
  { bg: 'linear-gradient(135deg, #c084fc, #a855f7)', label: 'Лиловый' },
  { bg: 'linear-gradient(135deg, #64748b, #475569)', label: 'Серый' },
  { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', label: 'Янтарный' },
  { bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', label: 'Индиго' },
  { bg: 'linear-gradient(135deg, #fb7185, #e11d48)', label: 'Коралловый' },
  { bg: 'linear-gradient(135deg, #34d399, #059669)', label: 'Изумрудный' },
  { bg: 'linear-gradient(135deg, #a3e635, #65a30d)', label: 'Лаймовый' },
  { bg: 'linear-gradient(135deg, #f43f5e, #be123c)', label: 'Рубиновый' },
  { bg: 'linear-gradient(135deg, #e879f9, #c026d3)', label: 'Фуксия' },
  { bg: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))', label: 'Стекло' },
  { bg: 'linear-gradient(135deg, #fde047, #eab308)', label: 'Победа' },
]

const EMOJIS = [
  '\u{1F31F}', '\u{1F98B}', '\u{1F33F}', '\u{2744}\uFE0F', '\u{1F98D}',
  '\u{1F31E}', '\u{1F30A}', '\u{2B50}', '\u{1F339}', '\u{1F30D}',
  '\u{1F33C}', '\u{26A1}', '\u{1F341}', '\u{1F308}', '\u{1F49B}',
  '\u{1F340}', '\u{1F431}', '\u{1F525}', '\u{1F380}', '\u{1F30C}',
  '\u{1F3C6}',
]

export const AVATARS: AvatarOption[] = COLORS.map((c, i) => ({
  id: i,
  emoji: EMOJIS[i],
  bg: c.bg,
  label: c.label,
}))

export function getAvatar(avatarId: number | undefined | null): AvatarOption {
  if (avatarId == null || avatarId < 0 || avatarId >= AVATARS.length) return AVATARS[0]
  return AVATARS[avatarId]
}
