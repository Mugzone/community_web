import { createContext, Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations } from './locales'
import type { Locale } from './i18nTypes'

export const LOCALES: { code: Locale; name: string }[] = [
  { code: 'zh-hans', name: '简体中文' },
  { code: 'zh-hant', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
]

type TranslateVars = Record<string, string | number>

const fallbackLocale: Locale = 'en'
const storageKey = 'malody.lang'

const aliases: Record<string, Locale> = {
  en: 'en',
  'en-us': 'en',
  ja: 'ja',
  'ja-jp': 'ja',
  'zh-cn': 'zh-hans',
  'zh-hans': 'zh-hans',
  zh_hans: 'zh-hans',
  'zh-tw': 'zh-hant',
  'zh-hk': 'zh-hant',
  'zh-hant': 'zh-hant',
  zh_hant: 'zh-hant',
  vi: 'en',
  'vi-vn': 'en',
}

const normalizeLocale = (value?: string | null): Locale | undefined => {
  if (!value) return undefined
  return aliases[value.toLowerCase()] ?? aliases[value.replace('_', '-').toLowerCase()]
}

const readStoredLocale = (): Locale | undefined => {
  try {
    return normalizeLocale(localStorage.getItem(storageKey))
  } catch {
    return undefined
  }
}

const detectLocale = (): Locale => {
  const stored = readStoredLocale()
  if (stored) return stored
  try {
    if (typeof navigator !== 'undefined') {
      for (const item of [navigator.language, ...(navigator.languages ?? [])]) {
        const detected = normalizeLocale(item)
        if (detected) return detected
      }
    }
  } catch {
  }
  return fallbackLocale
}

let currentLocale: Locale = readStoredLocale() ?? fallbackLocale

const formatMessage = (template: string, vars?: TranslateVars): string => {
  if (!vars) return template
  let output = template
  Object.entries(vars).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  })
  return output
}

export const t = (key: string, vars?: TranslateVars): string => {
  const dict = translations[currentLocale] ?? {}
  const template = dict[key] || translations[fallbackLocale]?.[key] || key
  return formatMessage(template, vars)
}

type I18nContextValue = {
  lang: Locale
  setLang: (locale: Locale) => void
  t: (key: string, vars?: TranslateVars) => string
  locales: typeof LOCALES
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>(() => detectLocale())
  currentLocale = lang

  useEffect(() => {
    currentLocale = lang
    try {
      document.documentElement.lang = lang
      localStorage.setItem(storageKey, lang)
    } catch {
    }
    const onLocaleChange = () => setLangState(readStoredLocale() ?? fallbackLocale)
    window.addEventListener('malody:locale', onLocaleChange)
    return () => window.removeEventListener('malody:locale', onLocaleChange)
  }, [lang])

  const setLang = (locale: Locale) => {
    currentLocale = locale
    setLangState(locale)
    try {
      localStorage.setItem(storageKey, locale)
    } catch {
    }
    try {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload()
      }
    } catch {
    }
  }

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t, locales: LOCALES }),
    [lang],
  )

  return (
    <I18nContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </I18nContext.Provider>
  )
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return { lang: currentLocale, setLang: (_l: Locale) => {}, t, locales: LOCALES }
  }
  return ctx
}
