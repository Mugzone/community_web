import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, showNotify } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchWikiTmplPage, saveWikiTemplate, fetchWikiPreview } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

type Model = { id: number | string; key: string; name: string; raw: string }
const FALLBACK: Model = { id: '', key: '', name: '', raw: '' }

type Tool = { type: string; title: string; cls: string }
const TOOLS: Tool[] = [
  { type: 'bold', title: i18nT('Bold'), cls: 'tool-B' },
  { type: 'italic', title: i18nT('Italic'), cls: 'tool-I' },
  { type: 'h1', title: i18nT('1st level Heading'), cls: 'tool-H1' },
  { type: 'h2', title: i18nT('2nd level Heading'), cls: 'tool-H2' },
  { type: 'h3', title: i18nT('3rd level Heading'), cls: 'tool-H3' },
  { type: 'list', title: i18nT('List'), cls: 'tool-list' },
  { type: 'img', title: i18nT('Image'), cls: 'tool-img' },
  { type: 'link', title: i18nT('Link'), cls: 'tool-link' },
  { type: 'table', title: i18nT('Table'), cls: 'tool-table' },
]

/** /page/tmpl/edit —— 老站 wiki/wiki_tmpl_edit.html（模板编辑 + 预览） */
export default function TmplEdit() {
  const [sp] = useSearchParams()
  const tid = sp.get('tid') ?? ''
  const [content, setContent] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const { data } = useLoad<Model>(
    async () => {
      if (!tid) return FALLBACK
      const resp: any = await fetchWikiTmplPage(tid)
      const p: any = resp?.data ?? resp
      const tmpl: any = p?.tmpl ?? p
      return {
        id: tmpl?.id ?? tid,
        key: String(tmpl?.key ?? ''),
        name: String(p?.name ?? tmpl?.name ?? tmpl?.key ?? tid),
        raw: String(tmpl?.raw ?? ''),
      }
    },
    [tid],
    FALLBACK,
  )

  useEffect(() => setContent(data.raw ?? ''), [data.raw])

  const tmplKey = data.key || tid

  const save = async () => {
    try {
      await saveWikiTemplate(tmplKey, content.trim())
      window.location.href = `/page/tmpl/${data.id || tid}`
    } catch {
      showNotify(i18nT('Failed to save, please try again later.'), 'err')
    }
  }

  const preview = async () => {
    try {
      const resp: any = await fetchWikiPreview(content)
      setPreviewHtml(String(resp?.data ?? resp ?? ''))
    } catch { /* ignore */ }
  }

  const perform = (type: string) => {
    const el = editorRef.current
    const start = el?.selectionStart ?? content.length
    const end = el?.selectionEnd ?? content.length
    const selected = content.slice(start, end) || ' content '
    let snippet = ''
    switch (type) {
      case 'bold': snippet = `**${selected}**`; break
      case 'italic': snippet = `//${selected}//`; break
      case 'h1': snippet = `=${selected}=`; break
      case 'h2': snippet = `==${selected}==`; break
      case 'h3': snippet = `===${selected}===`; break
      case 'list': snippet = '* list item 1\n* list item 2'; break
      case 'img': snippet = '[img:your image link here]'; break
      case 'link': snippet = '[http://your_link.com  title]'; break
      case 'table': snippet = '|-\n|! title | title | title |\n| value | value | value |'; break
      default: snippet = selected
    }
    setContent(content.slice(0, start) + snippet + content.slice(end))
  }

  return (
    <Shell
      variant="two-col"
      css={['wiki_edit.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>{i18nT('Help')}</h4>
          <a href={URLS.wiki(2)}>{i18nT('Markup Tutorial')}</a>
        </>
      }
    >
      <div className="g_title">Editing:{'\u00a0'}{data.name || tid}</div>
      <div className="g_cont">
        <h1 className="msg">{i18nT('Your are editing this page, sidebar has some articles for you to learn our markup language and our edit principles.')}</h1>
        <div className="g_edittool">
          {TOOLS.map((t) => (
            <a key={t.type} href="#" data-type={t.type} onClick={(e) => { e.preventDefault(); perform(t.type) }}>
              <span title={t.title} className={t.cls}></span>
            </a>
          ))}
          <em className="clear"></em>
        </div>
        <div className="edit">
          <textarea
            name="edit"
            id="J_edit"
            cols={80}
            rows={30}
            dir="ltr"
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="button">
          <div className="g_btn btn" id="J_save" onClick={() => void save()}>{i18nT('Save')}</div>
          <a href="#" id="J_pre" onClick={(e) => { e.preventDefault(); void preview() }}>{i18nT('Preview')}</a>
          <a href={`/page/tmpl/${data.id || tid}`}>{i18nT('Cancel')}</a>
        </div>
        <div className="g_tip">
          <span>{i18nT('Saving...')}</span>
          <span className="err">{i18nT('Failed to save, please try again later.')}</span>
          <span className="err">{i18nT('You are not permitted to edit this page.')}</span>
        </div>
        <div className="preview" id="J_preview" style={{ display: previewHtml ? 'block' : 'none' }}>
          <h1 className="msg">{i18nT('Preview')}</h1>
          <div className="g_wiki" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
        </div>
      </div>
    </Shell>
  )
}
