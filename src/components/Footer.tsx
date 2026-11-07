import { useState, type ReactNode } from 'react'
import { URLS } from '../lib/urls'

const LANGUAGES = [
  { code: 'zh-hans', name: '简体中文' },
  { code: 'zh-hant', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'vi', name: 'Tiếng Việt' },
]

/** 复刻老站 base.html / base_width.html 的 footer */
export function Footer({ extra }: { extra?: ReactNode }) {
  const [lang, setLang] = useState(() => localStorage.getItem('malody.lang') ?? 'en')
  return (
    <footer id="footer">
      {extra}
      <div className="line">
        <a href={URLS.limit}>The Jail</a>
        <i></i>
        <a href={URLS.wikiAbout}>About us</a>
        <i></i>
        <form action="/i18n/setlang/" method="post" onSubmit={(e) => { e.preventDefault(); localStorage.setItem('malody.lang', lang); window.dispatchEvent(new Event('malody:locale')) }}>
          <input name="next" type="hidden" value={window.location.pathname} />
          <select name="language" className="g_options" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <input className="g_round" type="submit" value="Change" />
        </form>
      </div>
      <span className="copy">Copyright &copy; 2013 ~ 2025 Mugzone</span>
    </footer>
  )
}
