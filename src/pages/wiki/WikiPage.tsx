import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, num, formatTime, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import {
  fetchWiki, getSession,
  lockWikiPage, updateWikiTitle, deleteWikiPage, toggleWikiNews,
} from '../../network/api'
import {
  fetchTalkList, saveTalk, operateTalk, fetchTalkRaw, submitVote,
} from '../../network/legacy'
import { bindHiddenToggles } from '../../utils/wiki'
import { useWikiHtml, useWikiLang, renderTalkHtml, renderTalkSmallHtml } from '../../utils/wikiRender'
import { t as i18nT } from '../../i18n'
import { avatarUrl } from '../../utils/formatters'

/* ------------------------------------------------------------------ *
 * wiki/wiki_page.html（base_width.html 宽版）+ module/wiki + module/plugin
 * 正文渲染器已抽到 utils/wikiRender.tsx：服务端只返回 raw，前端现算 HTML。
 * ------------------------------------------------------------------ */

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
  { type: 'bold', cls: 'tool-B', title: i18nT('Bold') },
  { type: 'italic', cls: 'tool-I', title: i18nT('Italic') },
  { type: 'h1', cls: 'tool-H1', title: i18nT('1st level Heading') },
  { type: 'h2', cls: 'tool-H2', title: i18nT('2nd level Heading') },
  { type: 'h3', cls: 'tool-H3', title: i18nT('3rd level Heading') },
  { type: 'list', cls: 'tool-list', title: i18nT('List') },
  { type: 'img', cls: 'tool-img', title: i18nT('Image') },
  { type: 'link', cls: 'tool-link', title: i18nT('Link') },
  { type: 'table', cls: 'tool-table', title: i18nT('Table') },
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
  /** 服务端返回的 raw 文本，由前端 renderTalkHtml 现算 HTML */
  content?: string
  /** 'chat' 走老站 w2b_chat 精简渲染器；缺省走完整 woc2baka */
  renderer?: string
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
    const bodyHtml = renderTalkHtml(String(t.content ?? ''), t.renderer)
    if (t.type === 1) {
      // talk/like.tmpl.html：<p> 必须是 .g_wiki.meta 的直接子元素，
      // 否则块级 wrapper 会把固定高度的白块撑塌，时间掉到灰底上。
      return (
        <li className="item small" data-id={tid} data-time={t.time} key={`${tid}-${idx}`}>
          <div className="bg right">
            <div
              className="g_wiki meta"
              dangerouslySetInnerHTML={{
                __html: renderTalkSmallHtml(String(t.content ?? ''), t.renderer, {
                  name: showName, userUrl: URLS.user(uid), time: showTime,
                }),
              }}
            />
          </div>
        </li>
      )
    }
    return (
      <li className="item" data-id={tid} data-time={t.time} key={`${tid}-${idx}`}>
        <a className="bg left" href={URLS.user(uid)}>
          {/* 老站 widget/discuss_item.html:5 {% avatar item.user 64 small=True %} */}
          <img src={avatarUrl(t.avatar, uid, 64)} style={{ background: 'none' }} alt="" />
        </a>
        <div className="bg right">
          <div className="g_wiki">
            <p className="meta">
              {t.num ? <span className="num">{t.num}</span> : null}
              <a href={URLS.user(uid)} className="name">{showName}</a>
              <span className="time">{showTime}</span>
              {!t.isOwn && (
                <a href="#" data-type="reply" title={i18nT('Reply')} className="tool" onClick={(e) => { e.preventDefault(); openEditor(`@${showName} `, tid) }}>{i18nT('Reply')}</a>
              )}
              {t.canEdit && (
                <a href="#" data-type="edit" title={i18nT('Edit')} className="tool" onClick={(e) => { e.preventDefault(); void onEditItem(tid) }}>{i18nT('Edit')}</a>
              )}
              {t.canDel && (
                <a href="#" data-type="del" title={i18nT('Delete')} className="tool" onClick={(e) => { e.preventDefault(); void onDelete(tid) }}>{i18nT('Delete')}</a>
              )}
            </p>
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
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
            <a className="g_btn btn g_talk_new" data-type="save" id="g_talk_save" href="#" onClick={(e) => { e.preventDefault(); void onSave() }}>{i18nT('Reply')}</a>
          </p>
        </div>
      </div>

      <div className="g_talk_tool">
        <div className="g_btn btn g_talk_new" data-type="new" onClick={() => openEditor()}><i></i>{i18nT('Reply')}</div>
      </div>
      <ul id="g_talk_list">{talkItems.map(renderItem)}</ul>
      <div id="g_talk_next" data-type="next" className="talk_btn btn" onClick={() => setTalkPage((p) => p + 1)}>{i18nT('Show more')}</div>
      <div className="g_talk_new_rep" id="g_talk_new2">
        <p>{i18nT('Want to say something?')}</p>
        <div className="g_btn btn g_talk_new" data-type="new" onClick={() => openEditor()}><i></i>{i18nT('Reply')}</div>
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
      const resp = await fetchWiki({ pid: Number(id) || undefined, lang: 0 })
      return (resp ?? {}) as Record<string, any>
    },
    [id],
    {} as Record<string, any>,
  )

  const uid = getSession()?.uid ?? 1
  // 服务端只返回 raw；无论旧接口的 raw 标志是什么，都不再消费服务端 html
  const baseRaw = String(page.wiki ?? page.content ?? '')
  const wikiHtml = useWikiHtml(baseRaw)

  const { lang, langHtml, changeLang } = useWikiLang(key)
  const [titleOverride, setTitleOverride] = useState<string>('')
  const [lockedOverride, setLockedOverride] = useState<boolean | null>(null)
  const [newsBusy, setNewsBusy] = useState(false)
  // 同步 in-flight 锁：React state 批处理下 newsBusy 挡不住同一帧内的双击。
  const newsInFlight = useRef(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const title = titleOverride || String(page.title ?? '') || `Wiki #${id}`
  const limit = num(page.limit, 0)
  // 老站 wiki_page.html 用 object.limit >= 16 判定「团队维护 / 已锁定」，
  // 用 conf["isorg"]（is_commu）露出 Lock / Change title / Delete / Edit 按钮。
  // 后端 GetWiki 现下发这两个字段；缺省一律收起，避免旧接口下按钮对所有人可见。
  const locked = lockedOverride ?? (page.limit !== undefined ? limit >= 16 : Boolean(page.locked))
  const isorg = page.isorg === true

  useEffect(() => bindHiddenToggles(bodyRef.current), [wikiHtml, langHtml])

  /* module/plugin/src/init.js:8-43：正文里的 .g_tmpl_vote 用事件委托处理，
     eid / choice 取自元素自身 data 属性，成功就地改成 Voted。 */
  useEffect(() => {
    const root = bodyRef.current
    if (!root) return
    const onClick = (e: MouseEvent): void => {
      const node = (e.target as HTMLElement).closest('.g_tmpl_vote') as HTMLElement | null
      if (!node || !root.contains(node)) return
      e.preventDefault()
      if (node.classList.contains('g_tmpl_voted')) return
      if (!window.confirm('Are you sure to vote this one?')) return
      void (async () => {
        try {
          await submitVote({ eid: node.dataset.eid ?? '', choice: node.dataset.choice ?? '' })
          node.classList.add('g_tmpl_voted')
          node.textContent = i18nT('Voted')
        } catch {
          showNotify('Can not vote', 'err')
        }
      })()
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [])

  const onEdit = (): void => {
    window.location.href = `/wiki/edit?key=${encodeURIComponent(key)}&lang=${lang}&from=${encodeURIComponent(window.location.pathname + window.location.search)}`
  }

  const onLock = async (lockIt: boolean): Promise<void> => {
    try {
      await lockWikiPage({ pid: Number(id) || 0, uid, locked: lockIt ? 1 : 0 })
      setLockedOverride(lockIt)
      showNotify('Success', 'succ')
    } catch {
      showNotify(i18nT('Operation failed'), 'err')
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

  /* web-v2 Wiki.tsx handleToggleNews：无表单的一键 toggle，服务端按
     link="/wiki/{pid}" 决定上架(code=1)还是下架(code=2)，标题/时间/描述
     都由服务端从 wiki_page 生成。按钮不查询当前状态，文案保持固定。 */
  const onToggleNews = async (): Promise<void> => {
    // 连点两次会「上架后立刻下架」，用 ref 做同步锁而不是只靠 state。
    if (newsInFlight.current) return
    const pid = Number(id) || 0
    if (!pid) return
    if (uid <= 1) { showNotify(i18nT('Please login'), 'err'); return }
    newsInFlight.current = true
    setNewsBusy(true)
    try {
      const resp = await toggleWikiNews({ pid, uid })
      if (resp?.code === 1) { showNotify(i18nT('News published.'), 'succ'); return }
      if (resp?.code === 2) { showNotify(i18nT('News unpublished.'), 'succ'); return }
      // 按钮露出用 isorg(2/3/8/9)，服务端 /push/news 用 IsAssistent(2/3/8)，
      // group 9 会走到这里，单独给权限提示。
      if (resp?.code === -5) { showNotify(i18nT('You do not have permission to push news.'), 'err'); return }
      showNotify(i18nT('Operation failed'), 'err')
    } catch {
      showNotify(i18nT('Operation failed'), 'err')
    } finally {
      newsInFlight.current = false
      setNewsBusy(false)
    }
  }

  const finalHtml = langHtml !== null ? langHtml : wikiHtml
  // 加载中正文也是空串，此时只显示下方骨架，不能当成「还没有内容」
  const gWikiInner = finalHtml || (loading ? '' : `<div class="g_wiki_new btn" data-type="edit">${i18nT('Click to create')}</div>`)

  return (
    <Shell variant="wide" title={title} css={['wiki.css', 'tmpl.css']}>
      <div className="wiki_title g_rblock">
        <div className="tail">
          <a href={URLS.intro}>Home</a>
          <a href={URLS.latest}>{i18nT('Recent Changes')}</a>
        </div>
        <div className="title">{title}</div>
        <div className="tool">
          {isorg && (locked
            ? <a href="#" className="btn g_toolbtn ul" data-type="unlock" title={i18nT('Unlock Page')} onClick={(e) => { e.preventDefault(); void onLock(false) }}><i></i></a>
            : <a href="#" className="btn g_toolbtn l" data-type="lock" title={i18nT('Lock Page')} onClick={(e) => { e.preventDefault(); void onLock(true) }}><i></i></a>
          )}
          {isorg && (
            <>
              <a href="#" className="btn g_toolbtn e" data-type="title" title={i18nT('Change title')} onClick={(e) => { e.preventDefault(); void onChangeTitle() }}><i></i></a>
              <a href="#" className="btn g_toolbtn d" data-type="del" title={i18nT('Delete')} onClick={(e) => { e.preventDefault(); void onDelete() }}><i></i></a>
              <a
                href="#"
                className={`btn g_toolbtn n${newsBusy ? ' busy' : ''}`}
                data-type="news"
                title={i18nT('Push news')}
                aria-busy={newsBusy}
                onClick={(e) => { e.preventDefault(); void onToggleNews() }}
              ><i></i></a>
            </>
          )}
        </div>
      </div>

      {limit >= 16 && (
        <div className="g_cont2 like_area g_rblock" style={{ textAlign: 'center', fontWeight: 'bold' }}>
          This page is maintained by the Malody team
        </div>
      )}

      <div className="g_cont2 g_rblock">
        <div className="tool">
          <LangTabs value={lang} onChange={(c) => { void changeLang(c) }} />
          {isorg && (
            <a href="#" className="btn g_toolbtn e" data-type="edit" title={i18nT('Edit')} onClick={(e) => { e.preventDefault(); onEdit() }}><i></i></a>
          )}
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

      {/* 老站 wiki_page.html 没有固定投票按钮；投票只由正文 {{ name:_vote }} 模板块渲染，
          由 module/plugin/src/init.js 在 #content 上做事件委托处理（见下方 useEffect）。 */}
      <TalkWidget talkKey={key} hasOwner={false} />
    </Shell>
  )
}
