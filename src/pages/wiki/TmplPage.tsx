import { useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, showNotify } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { operateWikiPage, fetchWikiTmplPage } from '../../network/legacy'
import { wikiToHtml } from '../../utils/wikiRender'
import { t as i18nT } from '../../i18n'

type Model = { name: string; id: number | string; key: string; raw: string }
const FALLBACK: Model = { name: '', id: '', key: '', raw: '' }

/** /page/tmpl/<name> —— 老站 wiki/wiki_tmpl.html + module/wikiTmpl（Usage/Preview/Delete） */
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
        // 只取 raw；服务端 html 字段不再作为渲染源
        raw: String(tmpl?.raw ?? p?.raw ?? ''),
      }
    },
    [name],
    FALLBACK,
  )

  // 复刻 wikiTmpl init.js：从 raw 里抽出 $param$ 生成 Usage。
  const params: string[] = []
  const reg = /\$([^$]+)\$/g
  let m: RegExpExecArray | null
  while ((m = reg.exec(data.raw)) !== null) {
    params.push(m[1])
  }

  // 老站 wiki_tmpl.html 的 Preview 用 {% autoescape off %}{{ tmpl.html }}；
  // 现在由前端按 raw 现算（模板块按 preview 的 ignore_tmpl 语义跳过）
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
