import { useEffect, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchWiki, saveWiki, getSession } from '../../network/api'
import { EditTool } from './WikiPage'
import { wikiToHtml } from '../../utils/wikiRender'
import { t as i18nT } from '../../i18n'

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
      const resp = await fetchWiki({ pid, lang: 0 })
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

  /** 老站 preview() 用 translate(content, conf={"ignore_tmpl": True})；
   *  渲染器已搬到前端，且按需求不走 is_admin 原文 HTML 特权分支。 */
  const onPreview = (): void => {
    setMode('preview')
    setPreviewHtml(wikiToHtml(content, { ignoreTemplates: true }).html)
  }

  const onSave = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    showNotify(i18nT('Saving...'), 'succ')
    try {
      await saveWiki({ wiki: content, pid, uid, lang: 0 })
      window.history.back()
    } catch {
      showNotify(i18nT('Failed to save, please try again later.'), 'err')
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
      title={i18nT('Editing')}
      css={['wiki_edit.css', 'tmpl.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>{i18nT('Help')}</h4>
          <a href={URLS.wiki(2)}>{i18nT('Markup Tutorial')}</a>
          <a href={URLS.wiki(4)}>{i18nT('Category Guide')}</a>
        </>
      }
    >
      <div className="g_title">{i18nT('Editing')}</div>
      <div className="g_cont">
        <h1 className="msg">{i18nT('Your are editing this page, sidebar has some articles for you to learn our markup language and our edit principles.')}</h1>

        {/* module/wiki_edit —— 编辑/预览切换 */}
        <div className="button">
          <a href="#" className="g_btn btn" data-type="edit" onClick={(e) => { e.preventDefault(); setMode('edit') }}>{i18nT('Edit')}</a>
          <a href="#" className="g_btn btn" data-type="preview" onClick={(e) => { e.preventDefault(); onPreview() }}>{i18nT('Preview')}</a>
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
          <div className="g_btn btn" data-type="save" onClick={() => { void onSave() }}>{i18nT('Save')}</div>
          <a href="#" className="btn" data-type="cancel" onClick={(e) => { e.preventDefault(); onCancel() }}>{i18nT('Cancel')}</a>
        </div>
        <div className="g_tip">
          <span>{i18nT('Saving...')}</span>
          <span className="err">{i18nT('Failed to save, please try again later.')}</span>
          <span className="err">{i18nT('You are not permitted to edit this page.')}</span>
          <span className="err">{i18nT('Editing is available for active account')}</span>
        </div>

        <div className="preview" id="J_preview" style={{ display: mode === 'preview' ? 'block' : 'none' }}>
          <h1 className="msg">{i18nT('Preview')}</h1>
          <div className="g_wiki" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
        </div>

        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
