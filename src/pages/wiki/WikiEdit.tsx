import { useEffect, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchWiki, saveWiki, getSession } from '../../network/api'
import { fetchWikiPreview } from '../../network/legacy'
import { EditTool, wikiToHtml } from './WikiPage'

/* ------------------------------------------------------------------ *
 * wiki/wiki_page_edit.html（预览/保存/工具条）+ module/wiki_edit
 * ------------------------------------------------------------------ */

const query = (k: string): string => new URLSearchParams(window.location.search).get(k) ?? ''

export default function WikiEdit() {
  const key = query('key')
  const pidMatch = key.match(/(\d+)/)
  const pid = pidMatch ? Number(pidMatch[1]) : 0

  const { data, loading } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchWiki({ pid, lang: 0, raw: 1 })
      return (resp ?? {}) as Record<string, any>
    },
    [key],
    {} as Record<string, any>,
  )

  const [content, setContent] = useState<string>('')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setContent(String(data.wiki ?? data.content ?? ''))
  }, [data.wiki, data.content])

  const uid = getSession()?.uid ?? 1

  const perform = (type: string): void => {
    const inserts: Record<string, string> = {
      bold: '** content **', italic: '// content //',
      h1: '= content =', h2: '== content ==', h3: '=== content ===',
      list: '* list item 1\n* list item 2',
      img: '[img:your image link here]',
      video: '[video:your video/swf link here]',
      link: '[http://your_link.com  title]',
      table: '|-\n|! title | title | title |\n| value | value | value |',
    }
    setContent((c) => c + (inserts[type] ?? ''))
  }

  const onPreview = async (): Promise<void> => {
    setMode('preview')
    try {
      const resp: any = await fetchWikiPreview(content)
      const html = String(resp?.data ?? resp ?? '')
      setPreviewHtml(html || wikiToHtml(content).html)
    } catch {
      setPreviewHtml(wikiToHtml(content).html)
    }
  }

  const onSave = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    showNotify('Saving...', 'succ')
    try {
      await saveWiki({ wiki: content, pid, uid, lang: 0 })
      window.history.back()
    } catch {
      showNotify('Failed to save, please try again later.', 'err')
    } finally {
      setSaving(false)
    }
  }

  const onCancel = (): void => {
    window.history.back()
  }

  return (
    <Shell
      variant="two-col"
      title="Editing"
      css={['wiki_edit.css', 'tmpl.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>Help</h4>
          <a href={URLS.wiki(2)}>Markup Tutorial</a>
          <a href={URLS.wiki(4)}>Category Guide</a>
        </>
      }
    >
      <div className="g_title">Editing</div>
      <div className="g_cont">
        <h1 className="msg">Your are editing this page, sidebar has some articles for you to learn our markup language and our edit principles.</h1>

        {/* module/wiki_edit —— 编辑/预览切换 */}
        <div className="button">
          <a href="#" className="g_btn btn" data-type="edit" onClick={(e) => { e.preventDefault(); setMode('edit') }}>Edit</a>
          <a href="#" className="g_btn btn" data-type="preview" onClick={(e) => { e.preventDefault(); void onPreview() }}>Preview</a>
        </div>

        <div style={{ display: mode === 'edit' ? 'block' : 'none' }}>
          <EditTool onPerform={perform} />
          <div className="edit">
            <textarea
              name="edit"
              id="J_edit"
              cols={80}
              rows={30}
              dir="ltr"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="button">
          <div className="g_btn btn" data-type="save" onClick={() => { void onSave() }}>Save</div>
          <a href="#" className="btn" data-type="cancel" onClick={(e) => { e.preventDefault(); onCancel() }}>Cancel</a>
        </div>
        <div className="g_tip">
          <span>Saving...</span>
          <span className="err">Failed to save, please try again later.</span>
          <span className="err">You are not permitted to edit this page.</span>
          <span className="err">Editing is available for active account</span>
        </div>

        <div className="preview" id="J_preview" style={{ display: mode === 'preview' ? 'block' : 'none' }}>
          <h1 className="msg">Preview</h1>
          <div className="g_wiki" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
        </div>

        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
