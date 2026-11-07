import type { MouseEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, LoadingBlock } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchChartDownload } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

type DownloadItem = { name?: string; url?: string }
type Model = { backId: number | string; list: DownloadItem[] }
const FALLBACK: Model = { backId: '', list: [] }

/** /page/download/<id> —— 老站 temp_download.html / wiki_404.html + 下载确认 */
export default function ChartDownload() {
  const { id = '' } = useParams()

  const { data, loading } = useLoad<Model>(
    async () => {
      const resp: any = await fetchChartDownload(id)
      const p: any = resp?.data ?? resp
      return {
        backId: p?.back_id ?? id,
        list: asArray<DownloadItem>(p?.list ?? p?.items ?? p),
      }
    },
    [id],
    FALLBACK,
  )

  const list = data.list ?? []
  const notFound = !loading && list.length === 0

  const onDownload = (name: string, e: MouseEvent<HTMLAnchorElement>) => {
    if (!window.confirm(`Download ${name}?`)) e.preventDefault()
  }

  return (
    <Shell variant="two-col" title={notFound ? 'Not found' : undefined} css={['akari.css']} sidebar={<DefaultSidebar />}>
      {notFound ? (
        <>
          <div className="g_title">{i18nT('Page Not Found')}</div>
          <div className="g_cont p404">
            <p className="search">{i18nT('Try other searches:')}</p>
            <p>
              The page you search is not found, try another keyword or{' '}
              <a className="g_btn" href={`/page/create?title=${encodeURIComponent(id)}`}>{i18nT('Create a new page')}</a>
            </p>
            <img src={staticUrl('img/404.png')} alt="404" />
          </div>
        </>
      ) : (
        <>
          <div className="g_title">Chart Download</div>
          <div className="g_cont wiki_change">
            <div className="g_actbar">
              <a href={URLS.wiki(data.backId)} className="g_btn">{i18nT('Back')}</a>
            </div>
            {list.map((it, i) => (
              <h1 key={i}>
                <a download={it.name} href={it.url} onClick={(e) => onDownload(it.name ?? '', e)}>{it.name}</a>
              </h1>
            ))}
            {loading && <LoadingBlock />}
          </div>
        </>
      )}
    </Shell>
  )
}
