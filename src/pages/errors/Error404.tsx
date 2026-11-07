import { Shell } from '../../components/Layout'
import { staticUrl } from '../../lib/urls'
import { t as i18nT } from '../../i18n'

/** 404.html */
export default function Error404() {
  return (
    <Shell variant="wide" css={['akari.css']}>
      <div className="g_title">{i18nT('Page Not Found')}</div>
      <div className="g_cont p404">
        <img src={staticUrl('img/404.png')} />
      </div>
    </Shell>
  )
}
