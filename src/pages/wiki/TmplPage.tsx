import { useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { URLS } from '../../lib/urls'
import { operateWikiPage, fetchWikiTmplPage } from '../../network/pageWeb'
import { wikiToHtml } from '../../utils/wikiRender'
import { t as i18nT } from '../../i18n'

type Model = { name: string; id: number | string; key: string; raw: string }
const FALLBACK: Model = { name: '', id: '', key: '', raw: '' }

export default function TmplPage() {
  const { name = '' } = useParams()

  const { data } = useLoad<Model>(
    async () => {
      const resp: any = await fetchWikiTmplPage(name)
      const p: any = resp?.data ?? resp
      const tmpl: any = p?.tmpl ?? p
      return {
        name: String(p?.name ?? name),
        id: tmpl?.id ?? name,
        key: String(tmpl?.key ?? ''),
        raw: String(tmpl?.raw ?? p?.raw ?? ''),
      }
    },
    [name],
    FALLBACK,
  )

  const params: string[] = []
  const reg = /\$([^$]+)\$/g
  let m: RegExpExecArray | null
  while ((m = reg.exec(data.raw)) !== null) {
    params.push(m[1])
  }

  const previewHtml = wikiToHtml(data.raw, { ignoreTemplates: true }).html

  const del = async () => {
    if (!window.confirm('Are you sure to delete the page?')) return
    try {
      await operateWikiPage('delete', { key: data.key })
      window.location.href = URLS.index
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  return (
    <Shell variant="two-col" title={i18nT('Template')} css={['wiki.css', 'tmpl.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">Template:{data.name}</div>
      <div className="g_cont tmplpage">
        <div className="g_actbar">
          <a href={`/page/tmpl/edit?tid=${data.id}`} className="g_btn">{i18nT('Edit')}</a>
          <a href="#" className="g_btn btn" data-type="del" onClick={(e) => { e.preventDefault(); void del() }}>{i18nT('Delete')}</a>
        </div>
        <div className="org">{data.raw}</div>
        <h1>Usage:</h1>
        <div className="use">
          <p>{'{{'}</p>
          <p>name:{data.name}</p>
          {params.map((p) => <p key={p}>{p}:</p>)}
          <p>{'}}'}</p>
        </div>
        <h1>Preview:</h1>
        <div className="g_wiki" dangerouslySetInnerHTML={{ __html: `${previewHtml}<span class="clear"></span>` }}></div>
      </div>
    </Shell>
  )
}
