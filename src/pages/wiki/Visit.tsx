import { Navigate, useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { URLS, staticUrl } from '../../lib/urls'
import { t as i18nT } from '../../i18n'

/** /visit/<key> —— 老站 wiki_short 短链跳转，未知 key 显示 404 风格提示 */
const SHORT_LINKS: Record<string, number> = {
  stable: 965,
  skin: 1936,
  uis: 1778,
  faq: 175,
}

export default function Visit() {
  const { key = '' } = useParams()
  const id = SHORT_LINKS[key]

  if (id !== undefined) {
    return <Navigate to={URLS.wiki(id)} replace />
  }

  return (
    <Shell variant="two-col" title="Not found" css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">{i18nT('Page Not Found')}</div>
      <div className="g_cont p404">
        <p className="search">{i18nT('Try other searches:')}</p>
        <p>
          The page you search is not found, try another keyword or{' '}
          <a className="g_btn" href="/page/create">{i18nT('Create a new page')}</a>
        </p>
        <img src={staticUrl('img/404.png')} alt="404" />
      </div>
    </Shell>
  )
}
