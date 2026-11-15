import { useEffect, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad } from '../../lib/useLoad'
import { LoadingBlock } from '../../components/fragments'
import { showNotify } from '../../lib/notify'
import { URLS } from '../../lib/urls'
import { fetchWiki, saveWiki, getSession } from '../../network/api'
import { EditTool } from './WikiPage'
import { wikiToHtml } from '../../utils/wikiRender'
import { t as i18nT } from '../../i18n'


const query = (k: string): string => new URLSearchParams(window.location.search).get(k) ?? ''

type WikiTarget = { pid?: number; sid?: number; cid?: number; touid?: number; prefix?: string }

const parseWikiKey = (raw: string): WikiTarget => {
  const m = raw.match(/^(wiki|song|chart|user)_(\d+)$/)
  if (m) {
    const n = Number(m[2])
    switch (m[1]) {
      case 'wiki': return { pid: n }
      case 'song': return { sid: n }
      case 'chart': return { cid: n }
      case 'user': return { touid: n }
    }
  }
  return raw ? { prefix: raw } : {}
}

const backUrl = (raw: string, from: string): string => {
  if (from.startsWith('/')) return from
  const m = raw.match(/^(wiki|song|chart|skin|user)_(\d+)$/)
  if (!m) return '/'
  const n = m[2]
  switch (m[1]) {
    case 'wiki': return URLS.wiki(n)
    case 'song': return URLS.song(n)
    case 'chart': return URLS.chartPage(n)
    case 'skin': return URLS.skinDetail(n)
    case 'user': return URLS.user(n)
    default: return '/'
  }
}

export default function WikiEdit() {
  const key = query('key')
  const from = query('from')
  const target = parseWikiKey(key)

  const { data, loading } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchWiki({ ...target, lang: 0 })
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

  const onPreview = (): void => {
    setMode('preview')
    setPreviewHtml(wikiToHtml(content, { ignoreTemplates: true }).html)
  }

  const onSave = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    showNotify(i18nT('Saving...'), 'succ')
    try {
      await saveWiki({ wiki: content, ...target, uid, lang: 0 })
      window.location.replace(backUrl(key, from))
    } catch {
      showNotify(i18nT('Failed to save, please try again later.'), 'err')
    } finally {
      setSaving(false)
    }
  }

  const onCancel = (): void => {
    window.location.replace(backUrl(key, from))
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
