import { createContext, useContext, useEffect, useState } from 'react'
import en from './translations/en'
import uk from './translations/uk'
import km from './translations/km'
import vi from './translations/vi'
import ne from './translations/ne'

const translations = { en, uk, km, vi, ne }

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

function lookup(dict, key) {
  return key.split('.').reduce((obj, part) => (obj && obj[part] !== undefined ? obj[part] : undefined), dict)
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en')

  useEffect(() => {
    const saved = localStorage.getItem('rannikon_lang')
    if (saved && translations[saved]) setLangState(saved)
  }, [])

  function setLang(next) {
    if (!translations[next]) return
    setLangState(next)
    localStorage.setItem('rannikon_lang', next)
  }

  function t(key) {
    const value = lookup(translations[lang], key)
    if (value !== undefined) return value
    const fallback = lookup(translations.en, key)
    return fallback !== undefined ? fallback : key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
