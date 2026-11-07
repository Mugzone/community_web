import type { Locale } from '../i18n'

export const getOrgParam = (lang: Locale) => (lang === 'en-US' ? 0 : 1)
