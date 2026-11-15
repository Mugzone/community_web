import type { Locale } from '../i18nTypes'

export const getOrgParam = (lang: Locale) => (lang === 'en' ? 0 : 1)
