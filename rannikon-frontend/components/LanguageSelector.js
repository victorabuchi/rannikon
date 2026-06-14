import { useLanguage } from '@/lib/i18n'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'km', flag: '🇰🇭', name: 'ខ្មែរ' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'ne', flag: '🇳🇵', name: 'नेपाली' },
]

export default function LanguageSelector({ style, dark }) {
  const { lang, setLang } = useLanguage()

  return (
    <select
      value={lang}
      onChange={e => setLang(e.target.value)}
      aria-label="Language"
      style={{
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '6px',
        border: dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #d0d7de',
        background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
        color: dark ? '#fff' : '#1a1a18',
        cursor: 'pointer',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
      ))}
    </select>
  )
}
