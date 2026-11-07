import { useState, type ReactNode } from 'react'
import { LOCALES, t, useI18n, type Locale } from '../i18n'
import { URLS } from '../lib/urls'

/** 复刻老站 base.html / base_width.html 的 footer；语言只保留前四种（已去掉 vi）。 */
export function Footer({ extra }: { extra?: ReactNode }) {
  const { lang, setLang } = useI18n()
  const [pending, setPending] = useState<Locale>(lang)
  return (
    <footer id="footer">
      {extra}
      <div className="line">
        <a href={URLS.limit}>{t('The Jail')}</a>
        <i></i>
        <a href={URLS.wikiAbout}>{t('About us')}</a>
        <i></i>
        <form action="/i18n/setlang/" method="post" onSubmit={(e) => { e.preventDefault(); setLang(pending) }}>
          <input name="next" type="hidden" value={window.location.pathname} />
          <select name="language" className="g_options" value={pending} onChange={(e) => setPending(e.target.value as Locale)}>
            {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <input className="g_round" type="submit" value={t('Change')} />
        </form>
      </div>
      <span className="copy">Copyright &copy; 2013 ~ 2026 Mugzone</span>
    </footer>
  )
}
