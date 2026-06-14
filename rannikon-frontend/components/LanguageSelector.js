import { useLanguage } from '@/lib/i18n'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'km', flag: '🇰🇭', name: 'ខ្មែរ' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'ne', flag: '🇳🇵', name: 'नेपाली' },
]

export default function LanguageSelector({ style, dark, compact, className }) {
  const { lang, setLang } = useLanguage()

  return (
    <select
      value={lang}
      onChange={e => setLang(e.target.value)}
      aria-label="Language"
      className={className}
      style={{
        fontSize: '12px',
        padding: compact ? '4px' : '4px 8px',
        borderRadius: '6px',
        border: dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #d0d7de',
        background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
        color: dark ? '#fff' : '#1a1a18',
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
        width: compact ? '42px' : 'auto',
        ...style,
      }}
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{compact ? l.flag : `${l.flag} ${l.name}`}</option>
      ))}
    </select>
  )
}
