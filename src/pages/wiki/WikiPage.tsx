import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, num, formatTime, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import {
  fetchWiki, fetchWikiTemplate, getSession,
  lockWikiPage, updateWikiTitle, deleteWikiPage,
} from '../../network/api'
import {
  fetchWikiLang, fetchTalkList, saveTalk, operateTalk, fetchTalkRaw, submitVote,
} from '../../network/legacy'
import {
  renderWiki, bindHiddenToggles, type WikiTemplate, type WikiRenderOptions,
} from '../../utils/wiki'
import { renderTemplateHtml, applyTemplateHtml } from '../../utils/wikiTemplates'

/* ------------------------------------------------------------------ *
 * wiki/wiki_page.html（base_width.html 宽版）+ module/wiki + module/plugin
 * ------------------------------------------------------------------ */

/** {% trans %} 一律取英文原文；渲染器所需的英文标签 */
const RENDER_OPTIONS: WikiRenderOptions = {
  hiddenLabel: 'Click to display',
  tocLabel: 'Contents',
  templateLabel: 'Template',
  templateLoading: 'Loading template...',
}

const FEISHU_PREFIX = '<p>https://cbo17ty22x.feishu.cn/wiki/'

/**
 * 模板正文里的业务参数 uid/key 与 MaApi-go 全局鉴权参数同名，
 * 直接透传会让 token 校验失败（-1000），发请求前先改名，后端按新名读取。
 */
const TEMPLATE_PARAM_ALIAS: Record<string, string> = { uid: 'touid', key: 'tmplKey' }
const templateQuery = (params: Record<string, string>): Record<string, string> => {
  const q: Record<string, string> = {}
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'name') return
    q[TEMPLATE_PARAM_ALIAS[k] ?? k] = v
  })
  return q
}

/** 复刻 views.page_wiki：正文若是一个飞书文档链接，则整体换成 iframe */
export function wikiToHtml(raw: string): { html: string; templates: WikiTemplate[] } {
  const r = renderWiki(raw ?? '', RENDER_OPTIONS)
  if (r.html.startsWith(FEISHU_PREFIX)) {
    const url = r.html.replace(/<\/?p>/g, '').trim()
    return {
      html: `<iframe width="100%" height="1145px" frameborder="0" seamless src="${url}"></iframe>`,
      templates: [],
    }
  }
  return { html: r.html, templates: r.templates }
}

const TMPL_TEXT: Record<string, string> = {
  'wiki.template.login': 'Please sign in to view this block.',
  'wiki.template.finish': 'Finished',
  'wiki.template.empty': 'No entries yet.',
  'wiki.template.group': 'Group {{id}}',
  'wiki.template.eventsum': 'Event summary',
  'wiki.template.table.rank': '#',
  'wiki.template.table.player': 'Player',
  'wiki.template.table.value': 'Total',
  'wiki.template.unsupported': 'Template coming soon.',
  'wiki.template.unknown': 'Unknown template.',
}
export const tr = (key: string, vars?: Record<string, string | number>): string => {
  let s = TMPL_TEXT[key] ?? key
  if (vars) Object.keys(vars).forEach((k) => { s = s.replace(`{{${k}}}`, String(vars[k])) })
  return s
}

/** 用渲染器输出正文，并把 {{...}} 模板占位异步补成真实内容块 */
export function useWikiHtml(raw: string, alreadyHtml = false): string {
  const result = useMemo(
    () => (alreadyHtml ? { html: raw, templates: [] as WikiTemplate[] } : wikiToHtml(raw)),
    [raw, alreadyHtml],
  )
  const [html, setHtml] = useState<string>(result.html)
  useEffect(() => {
    let alive = true
    if (!result.templates.length) {
      setHtml(result.html)
      return
    }
    void (async () => {
      const emptyResp = { code: 0, data: {} }
      const blocks = await Promise.all(result.templates.map(async (tmpl) => {
        const n = tmpl.name.replace(/^_/, '')
        // action 数据全在 params，本地合成，不发网络请求
        if (n === 'action') {
          return renderTemplateHtml(tr, tmpl, emptyResp)
        }
        try {
          const resp = await fetchWikiTemplate({ name: n, ...templateQuery(tmpl.params) })
          return renderTemplateHtml(tr, tmpl, resp)
        } catch {
          // 请求失败：用 params 渲染骨架兜底，绝不留下 undefined
          return renderTemplateHtml(tr, tmpl, emptyResp)
        }
      }))
      if (alive) setHtml(applyTemplateHtml(result.html, blocks))
    })()
    return () => { alive = false }
  }, [result])
  return html
}

export const LANGS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'sc', label: '简体中文' },
  { code: 'tc', label: '繁體中文' },
  { code: 'jp', label: '日本語' },
  { code: 'kr', label: '한국어' },
]

/** wiki/wiki_lang2.html —— 多语言下拉 tab */
export function LangTabs({ value, onChange }: { value: string; onChange: (code: string, label: string) => void }) {
  const label = LANGS.find((l) => l.code === value)?.label ?? 'English'
  return (
    <div className="lang2">
      <span>{label}</span>
      <div className="drop">
        <div className="list">
          {LANGS.map((l) => (
            <a
              key={l.code}
              href="#"
              data-value={l.code}
              onClick={(e) => { e.preventDefault(); onChange(l.code, l.label) }}
            >{l.label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}

/** widget/edittool.html —— 完整标记工具条 */
const EDIT_TOOLS: { type: string; cls: string; title: string }[] = [
  { type: 'bold', cls: 'tool-B', title: 'Bold' },
  { type: 'italic', cls: 'tool-I', title: 'Italic' },
  { type: 'h1', cls: 'tool-H1', title: '1st level Heading' },
  { type: 'h2', cls: 'tool-H2', title: '2nd level Heading' },
  { type: 'h3', cls: 'tool-H3', title: '3rd level Heading' },
  { type: 'list', cls: 'tool-list', title: 'List' },
  { type: 'img', cls: 'tool-img', title: 'Image' },
  { type: 'link', cls: 'tool-link', title: 'Link' },
  { type: 'table', cls: 'tool-table', title: 'Table' },
]
export function EditTool({ onPerform }: { onPerform: (type: string) => void }) {
  return (
    <div className="g_edittool">
      {EDIT_TOOLS.map((t) => (
        <a key={t.type} href="#" data-type={t.type} onClick={(e) => { e.preventDefault(); onPerform(t.type) }}>
          <span title={t.title} className={t.cls}></span>
        </a>
      ))}
      <em className="clear"></em>
    </div>
  )
}

export type TalkItem = {
  tid?: number | string
  uid?: number | string
  name?: string
  time?: number | string
  content?: string
  num?: number | string
  type?: number
  avatar?: string
  isOwn?: boolean
  canEdit?: boolean
  canDel?: boolean
}

/** module/talk + widget/talk.html + widget/edittool.html —— 讨论区 */
export function TalkWidget({ talkKey, hasOwner }: { talkKey: string; hasOwner: boolean }) {
  const [talkPage, setTalkPage] = useState(0)
  const { data: talkItems, reload } = useLoad<TalkItem[]>(
    async () => {
      const resp: any = await fetchTalkList({ topic: talkKey, order: -1, from: talkPage })
      const d: any = resp?.data ?? resp ?? {}
      return asArray<TalkItem>(d?.list ?? d?.items ?? d)
    },
    [talkKey, talkPage],
    [] as TalkItem[],
  )

  const [editorOpen, setEditorOpen] = useState(false)
  const [content, setContent] = useState('')
  const [replyId, setReplyId] = useState<number | string>(0)
  const [editId, setEditId] = useState<number | string>(0)

  const openEditor = (text = '', rId: number | string = 0, eId: number | string = 0): void => {
    setContent(text)
    setReplyId(rId)
    setEditId(eId)
    setEditorOpen(true)
  }

  const perform = (type: string): void => {
    const inserts: Record<string, string> = {
      bold: '** content **', italic: '// content //',
      h1: '= content =', h2: '== content ==', h3: '=== content ===',
      list: '* list item 1\n* list item 2',
      img: '[img:your image link here]',
      link: '[http://your_link.com  title]',
      table: '|-\n|! title | title | title |\n| value | value | value |',
    }
    setContent((c) => c + (inserts[type] ?? ''))
  }

  const onSave = async (): Promise<void> => {
    const text = content.trim()
    if (!text) return
    const payload: Record<string, string | number | undefined> = { key: talkKey, content: text }
    if (replyId) payload.rep_id = replyId
    if (editId) payload.tid = editId
    if (hasOwner) payload.hasOwner = 1
    try {
      await saveTalk(payload)
      setContent('')
      setReplyId(0)
      setEditId(0)
      setEditorOpen(false)
      reload()
    } catch {
      showNotify('Server error', 'err')
    }
  }

  const onDelete = async (id: number | string): Promise<void> => {
    try {
      await operateTalk({ tid: id, type: 'del' })
      showNotify('Delete success!', 'succ')
      reload()
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const onEditItem = async (id: number | string): Promise<void> => {
    try {
      const resp: any = await fetchTalkRaw(id)
      const raw = String(resp?.data?.raw ?? resp?.raw ?? '')
      openEditor(raw, 0, id)
    } catch {
      showNotify('Server error', 'err')
    }
  }

  const renderItem = (t: TalkItem, idx: number) => {
    const tid = t.tid ?? idx
    const uid = t.uid ?? ''
    const showName = String(t.name ?? '')
    const showTime = formatTime(t.time)
    const body = String(t.content ?? '')
    if (t.type === 1) {
      return (
        <li className="item small" data-id={tid} data-time={t.time} key={`${tid}-${idx}`}>
          <div className="bg right">
            <div className="g_wiki meta">
              <a href={URLS.user(uid)} className="name">{showName}</a>
              {body}
              <span className="time">{showTime}</span>
              <span className="clear"></span>
            </div>
          </div>
        </li>
      )
    }
    return (
      <li className="item" data-id={tid} data-time={t.time} key={`${tid}-${idx}`}>
        <a className="bg left" href={URLS.user(uid)}>
          {t.avatar
            ? <img src={`http://cni.mugzone.net/avatar/${t.avatar}`} style={{ background: 'none' }} alt="" />
            : <img alt="" />}
        </a>
        <div className="bg right">
          <div className="g_wiki">
            <p className="meta">
              {t.num ? <span className="num">{t.num}</span> : null}
              <a href={URLS.user(uid)} className="name">{showName}</a>
              <span className="time">{showTime}</span>
              {!t.isOwn && (
                <a href="#" data-type="reply" title="Reply" className="tool" onClick={(e) => { e.preventDefault(); openEditor(`@${showName} `, tid) }}>Reply</a>
              )}
              {t.canEdit && (
                <a href="#" data-type="edit" title="Edit" className="tool" onClick={(e) => { e.preventDefault(); void onEditItem(tid) }}>Edit</a>
              )}
              {t.canDel && (
                <a href="#" data-type="del" title="Delete" className="tool" onClick={(e) => { e.preventDefault(); void onDelete(tid) }}>Delete</a>
              )}
            </p>
            {body}
            <span className="clear"></span>
            <p className="tool"></p>
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="g_talk" id="g_talk">
      <div id="g_talk_input" style={{ display: editorOpen ? 'block' : 'none' }}>
        <div className="wrap">
          <div className="desc">Notice: You are in public talk, please use English</div>
          <div className="tool">
            <EditTool onPerform={perform} />
            <a href="#" className="btn" data-type="cancel" id="J_cancel" onClick={(e) => { e.preventDefault(); setEditorOpen(false); setReplyId(0); setEditId(0) }}>X</a>
          </div>
          <textarea cols={80} rows={30} dir="ltr" value={content} onChange={(e) => setContent(e.target.value)}></textarea>
          <p>
            <a className="g_btn btn g_talk_new" data-type="save" id="g_talk_save" href="#" onClick={(e) => { e.preventDefault(); void onSave() }}>Reply</a>
          </p>
        </div>
      </div>

      <div className="g_talk_tool">
        <div className="g_btn btn g_talk_new" data-type="new" onClick={() => openEditor()}><i></i>Reply</div>
      </div>
      <ul id="g_talk_list">{talkItems.map(renderItem)}</ul>
      <div id="g_talk_next" data-type="next" className="talk_btn btn" onClick={() => setTalkPage((p) => p + 1)}>Show more</div>
      <div className="g_talk_new_rep" id="g_talk_new2">
        <p>Want to say something?</p>
        <div className="g_btn btn g_talk_new" data-type="new" onClick={() => openEditor()}><i></i>Reply</div>
      </div>
    </div>
  )
}

export default function WikiPage() {
  const params = useParams<{ id?: string }>()
  const id = params.id
    ?? new URLSearchParams(window.location.search).get('id')
    ?? window.location.pathname.match(/\/(\d+)\/?$/)?.[1]
    ?? ''
  const keyFromQuery = new URLSearchParams(window.location.search).get('key')
  const key = keyFromQuery || `wiki_${id}`

  const { data: page, loading } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchWiki({ pid: Number(id) || undefined, lang: 0, raw: 1 })
      return (resp ?? {}) as Record<string, any>
    },
    [id],
    {} as Record<string, any>,
  )

  const uid = getSession()?.uid ?? 1
  const baseRaw = String(page.wiki ?? page.content ?? '')
  const alreadyHtml = page.raw === false
  const wikiHtml = useWikiHtml(baseRaw, alreadyHtml)

  const [lang, setLang] = useState<string>('en')
  const [langHtml, setLangHtml] = useState<string | null>(null)
  const [titleOverride, setTitleOverride] = useState<string>('')
  const [lockedOverride, setLockedOverride] = useState<boolean | null>(null)
  const [voted, setVoted] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const title = titleOverride || String(page.title ?? '') || `Wiki #${id}`
  const locked = lockedOverride ?? Boolean(page.locked)
  const limit = num(page.limit, 0)
  const isorg = page.isorg !== false
  const voteEid = num(page.eid ?? (page.vote as any)?.eid, 0)
  const voteChoice = num(page.choice ?? (page.vote as any)?.choice, 1)

  useEffect(() => bindHiddenToggles(bodyRef.current), [wikiHtml, langHtml])

  const onChangeLang = async (code: string, label: string): Promise<void> => {
    setLang(code)
    try {
      const resp: any = await fetchWikiLang(key, code)
      const raw = String(resp?.data ?? resp ?? '')
      setLangHtml(raw ? wikiToHtml(raw).html : '')
    } catch {
      setLangHtml(null)
      showNotify('Server error', 'err')
    }
  }

  const onEdit = (): void => {
    window.location.href = `/wiki/edit?key=${encodeURIComponent(key)}&lang=${lang}`
  }

  const onLock = async (lockIt: boolean): Promise<void> => {
    try {
      await lockWikiPage({ pid: Number(id) || 0, uid, locked: lockIt ? 1 : 0 })
      setLockedOverride(lockIt)
      showNotify('Success', 'succ')
    } catch {
      showNotify('Operation failed', 'err')
    }
  }

  const onChangeTitle = async (): Promise<void> => {
    const next = window.prompt('enter new title', title)
    if (!next || !next.trim()) return
    try {
      const resp: any = await updateWikiTitle({ pid: Number(id) || 0, uid, title: next.trim() })
      if (resp?.code === -2) { showNotify('Title exist', 'err'); return }
      setTitleOverride(next.trim())
      showNotify('Success', 'succ')
    } catch {
      showNotify('Change failed', 'err')
    }
  }

  const onDelete = async (): Promise<void> => {
    if (!window.confirm('Are you sure to delete the page?')) return
    try {
      await deleteWikiPage({ pid: Number(id) || 0, uid })
      window.location.href = URLS.index
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const onVote = async (): Promise<void> => {
    if (voted) return
    if (!window.confirm('Are you sure to vote this one?')) return
    try {
      await submitVote({ eid: voteEid, choice: voteChoice })
      setVoted(true)
    } catch {
      showNotify('Can not vote', 'err')
    }
  }

  const finalHtml = langHtml !== null ? langHtml : wikiHtml
  const gWikiInner = finalHtml || '<div class="g_wiki_new btn" data-type="edit">Click to create</div>'

  return (
    <Shell variant="wide" title={title} css={['wiki.css', 'tmpl.css']}>
      <div className="wiki_title g_rblock">
        <div className="tail">
          <a href={URLS.intro}>Home</a>
          <a href={URLS.latest}>Recent Changes</a>
        </div>
        <div className="title">{title}</div>
        <div className="tool">
          {isorg && (locked
            ? <a href="#" className="btn g_toolbtn ul" data-type="unlock" title="Unlock Page" onClick={(e) => { e.preventDefault(); void onLock(false) }}><i></i></a>
            : <a href="#" className="btn g_toolbtn l" data-type="lock" title="Lock Page" onClick={(e) => { e.preventDefault(); void onLock(true) }}><i></i></a>
          )}
          <a href="#" className="btn g_toolbtn e" data-type="title" title="Change title" onClick={(e) => { e.preventDefault(); void onChangeTitle() }}><i></i></a>
          <a href="#" className="btn g_toolbtn d" data-type="del" title="Delete" onClick={(e) => { e.preventDefault(); void onDelete() }}><i></i></a>
        </div>
      </div>

      {limit >= 16 && (
        <div className="g_cont2 like_area g_rblock" style={{ textAlign: 'center', fontWeight: 'bold' }}>
          This page is maintained by the Malody team
        </div>
      )}

      <div className="g_cont2 g_rblock">
        <div className="tool">
          <LangTabs value={lang} onChange={(c, l) => { void onChangeLang(c, l) }} />
          <a href="#" className="btn g_toolbtn e" data-type="edit" title="Edit" onClick={(e) => { e.preventDefault(); onEdit() }}><i></i></a>
        </div>
        <div
          className="g_wiki"
          ref={bodyRef}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.g_wiki_new')) onEdit()
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: gWikiInner }} />
          <span className="clear"></span>
        </div>
        {loading && <LoadingBlock />}
      </div>

      {/* module/plugin —— widget/tmpl_vote.html 投票 */}
      <div className="g_cont2 g_rblock">
        <a
          href="#"
          className={`g_round g_tmpl_vote${voted ? ' g_tmpl_voted' : ''}`}
          data-eid={voteEid}
          data-choice={voteChoice}
          onClick={(e) => { e.preventDefault(); void onVote() }}
        >{voted ? 'Voted' : 'Vote'}</a>
        {voted && (
          <div className="g_tmpl_votedlist">
            <div><span>{voteChoice}</span><i style={{ width: '300px' }}></i>1</div>
          </div>
        )}
      </div>

      <TalkWidget talkKey={key} hasOwner={false} />
    </Shell>
  )
}
