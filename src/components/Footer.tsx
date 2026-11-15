import { type ReactNode } from 'react'
import { LOCALES, t, useI18n } from '../i18n'
import type { Locale } from '../i18nTypes'
import { URLS } from '../lib/urls'

export function Footer({ extra }: { extra?: ReactNode }) {
  const { lang, setLang } = useI18n()
  return (
    <footer id="footer">
      {extra}
      <div className="line">
        <a href={URLS.limit}>{t('The Jail')}</a>
        <i></i>
        <a href={URLS.wikiAbout}>{t('About us')}</a>
        <i></i>
        <form action="/i18n/setlang/" method="post" onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          setLang(String(data.get('language') ?? lang) as Locale)
        }}>
          <input name="next" type="hidden" value={window.location.pathname} />
          <select name="language" className="g_options" defaultValue={lang}>
            {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <input className="g_round" type="submit" value={t('Change')} />
        </form>
      </div>
      <span className="copy">Copyright &copy; 2013 ~ 2026 Mugzone</span>
    </footer>
  )
}
