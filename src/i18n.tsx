import { createContext, Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations } from './locales'

/** 老站 settings/__init__.py LANGUAGES 去掉 vi，只保留前四种。 */
export type Locale = 'zh-hans' | 'zh-hant' | 'en' | 'ja'

export const LOCALES: { code: Locale; name: string }[] = [
  { code: 'zh-hans', name: '简体中文' },
  { code: 'zh-hant', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
]

type TranslateVars = Record<string, string | number>

const fallbackLocale: Locale = 'en'
const storageKey = 'malody.lang'

/** 兼容 web-v2 / 越南语旧存档；未知语言一律回落到英语 */
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
    // ignore
  }
  return fallbackLocale
}

/**
 * 模块级当前语言。t() 是全站同步函数，页面无需 hook 即可接入；
 * Provider 用 key={lang} 重挂载子树，切换语言后所有 t() 立即重算。
 */
let currentLocale: Locale = readStoredLocale() ?? fallbackLocale

const formatMessage = (template: string, vars?: TranslateVars): string => {
  if (!vars) return template
  let output = template
  Object.entries(vars).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  })
  return output
}

/**
 * 翻译入口。key 必须是老站 .po 里的英文 msgid 原文。
 * 当前语言缺失该条、或 msgstr 为空时，直接返回英文 key（不自行翻译）。
 */
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
      // ignore (SSR / 隐私模式)
    }
    // 页脚表单沿用老站整页切换语义，派发事件后同步语言状态
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
      // ignore
    }
    // 老站 /i18n/setlang/ 是整页提交跳转；reload 让模块顶层的文案常量
    // 以新语言重新求值（否则它们只会在 import 时计算一次）。
    try {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload()
      }
    } catch {
      // ignore (SSR)
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

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Provider 未挂载时（冒烟测试等）仍可安全渲染，t() 走英文 fallback
    return { lang: currentLocale, setLang: (_l: Locale) => {}, t, locales: LOCALES }
  }
  return ctx
}
