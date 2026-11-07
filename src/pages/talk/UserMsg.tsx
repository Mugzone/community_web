import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, formatTime, num, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import {
  fetchTalkMessage,
  fetchTalkList,
  fetchTalkRaw,
  saveTalk,
  operateTalk,
} from '../../network/legacy'

/** talk/usermsg.html + widget/talk.html + widget/edittool_simple.html + module/talk/src/init.js */
type TalkMessageItem = {
  tid: number
  uid?: number | string
  name?: string
  avatar?: string
  time?: number | string
  content?: string
  num?: number | string
  isOwn?: boolean
  canEdit?: boolean
  canDel?: boolean
  type?: number
}
type UserMsgState = {
  msg: string
  reply: number
  title: string
  items: TalkMessageItem[]
  next: number | boolean
}

const EMPTY: UserMsgState = { msg: '', reply: 0, title: '', items: [], next: 0 }

const unwrap = (res: any): any => {
  if (!res || typeof res !== 'object') return {}
  const d = (res as any).data
  return d !== undefined && d !== null ? d : res
}

const normalize = (msgRes: any, listRes: any): UserMsgState => {
  const m: any = unwrap(msgRes) || {}
  const l: any = unwrap(listRes) || {}
  return {
    msg: String(m.msg ?? m.title ?? ''),
    reply: num(m.reply, 0),
    title: String(m.title ?? m.msg ?? ''),
    items: asArray<TalkMessageItem>(l),
    next: (l.next ?? 0) as number | boolean,
  }
}

/** 后端返回的是老站 translate() 渲染好的 wiki HTML，做最小脚本过滤后注入 */
const safeHtml = (raw: string): string => String(raw ?? '')
  .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/javascript\s*:/gi, '')

const INSERTS: Record<string, string> = {
  bold: '** content **',
  italic: '// content //',
  list: '* list item 1\n* list item 2',
  img: '[img:your image link here]',
  link: '[http://your_link.com  title]',
}

function EditTool({ onPerform }: { onPerform: (type: string) => void }) {
  const items: Array<[string, string, string]> = [
    ['bold', 'Bold', 'tool-B'],
    ['italic', 'Italic', 'tool-I'],
    ['list', 'List', 'tool-list'],
    ['img', 'Image', 'tool-img'],
    ['link', 'Link', 'tool-link'],
  ]
  return (
    <div className="g_edittool">
      {items.map(([type, title, cls]) => (
        <a key={type} href="#" data-type={type} onClick={(e) => { e.preventDefault(); onPerform(type) }}>
          <span title={title} className={cls}></span>
        </a>
      ))}
      <em className="clear"></em>
    </div>
  )
}

function TalkItemView({
  item,
  onReply,
  onEdit,
  onDelete,
}: {
  item: TalkMessageItem
  onReply: (tid: number) => void
  onEdit: (tid: number) => void
  onDelete: (tid: number) => void
}) {
  const href = URLS.user(item.uid ?? 0)
  const time = formatTime(item.time)

  // type == 1 为 like.tmpl.html 的精简样式
  if (item.type === 1) {
    return (
      <li className="item small" data-id={item.tid} data-time={item.time ?? ''}>
        <div className="bg right">
          <div className="g_wiki meta">
            <a href={href} className="name">{item.name ?? ''}</a>
            <div dangerouslySetInnerHTML={{ __html: safeHtml(item.content ?? '') }} />
            <span className="time">{time}</span>
            <span className="clear"></span>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="item" data-id={item.tid} data-time={item.time ?? ''}>
      <a className="bg left" href={href}>
        {item.avatar
          ? <img src={`http://cni.mugzone.net/avatar/${item.avatar}`} style={{ background: 'none' }} />
          : <img />}
      </a>
      <div className="bg right">
        <div className="g_wiki">
          <p className="meta">
            {item.num ? <span className="num">{item.num}</span> : null}
            <a href={href} className="name">{item.name ?? ''}</a>
            <span className="time">{time}</span>
            {!item.isOwn ? (
              <a href="#" data-type="reply" title="Reply" className="tool" onClick={(e) => { e.preventDefault(); onReply(item.tid) }}>Reply</a>
            ) : null}
            {item.canEdit ? (
              <a href="#" data-type="edit" title="Edit" className="tool" onClick={(e) => { e.preventDefault(); onEdit(item.tid) }}>Edit</a>
            ) : null}
            {item.canDel ? (
              <a href="#" data-type="del" title="Delete" className="tool" onClick={(e) => { e.preventDefault(); onDelete(item.tid) }}>Delete</a>
            ) : null}
          </p>
          <div dangerouslySetInnerHTML={{ __html: safeHtml(item.content ?? '') }} />
          <span className="clear"></span>
          <p className="tool"></p>
        </div>
      </div>
    </li>
  )
}

export default function UserMsg() {
  const params = useParams<{ host: string; guest: string }>()
  const host = params.host ?? '0'
  const guest = params.guest ?? '0'
  const key = `user_${host}_${guest}`

  const { data, loading } = useLoad<UserMsgState>(
    async () => {
      const [msgRes, listRes] = await Promise.all([
        fetchTalkMessage(host, guest).catch(() => ({})),
        fetchTalkList({ topic: key, order: -1 }).catch(() => ({})),
      ])
      return normalize(msgRes, listRes)
    },
    [key],
    EMPTY,
  )

  const [items, setItems] = useState<TalkMessageItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [editorShow, setEditorShow] = useState(false)
  const [text, setText] = useState('')
  const [replyId, setReplyId] = useState(0)
  const [editId, setEditId] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setItems(data.items)
    setHasMore(Boolean(data.next))
  }, [data.items, data.next])

  const openEditor = (show: boolean) => {
    setEditorShow(show)
    if (show) {
      window.requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  const onNew = () => {
    setReplyId(0)
    setEditId(0)
    openEditor(true)
  }

  const onCancel = () => {
    openEditor(false)
    setReplyId(0)
    setEditId(0)
  }

  const onPerform = (type: string) => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const selected = text.slice(start, end) || ' content '
    let replacement = INSERTS[type] ?? ''
    if (type === 'bold') replacement = `**${selected}**`
    else if (type === 'italic') replacement = `//${selected}//`
    setText(text.slice(0, start) + replacement + text.slice(end))
    window.requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + replacement.length, start + replacement.length)
    })
  }

  const onSave = async () => {
    const content = text.trim()
    if (content === '') return
    const payload: Record<string, string | number> = { key, content, hasOwner: 1 }
    if (replyId) payload.rep_id = replyId
    if (editId) payload.tid = editId
    if (data.reply) payload.rep_user = data.reply
    try {
      const res = await saveTalk(payload)
      const d: any = unwrap(res) || {}
      const item: TalkMessageItem = {
        tid: num(d.tid ?? d.id, Date.now()),
        uid: d.uid,
        name: (d.name ?? d.username ?? '') as string,
        time: d.time ?? Math.floor(Date.now() / 1000),
        content: (d.content ?? d.html ?? content) as string,
        isOwn: true,
        canEdit: true,
        canDel: true,
        type: 0,
      }
      if (editId) {
        setItems((prev) => prev.map((it) => (it.tid === editId ? { ...item, tid: editId } : it)))
      } else {
        setItems((prev) => [item, ...prev])
      }
      setText('')
      setReplyId(0)
      setEditId(0)
      openEditor(false)
    } catch {
      showNotify('Server error', 'err')
    }
  }

  const onReply = (tid: number) => {
    const target = items.find((it) => it.tid === tid)
    setText(`@${target?.name ?? ''} `)
    setReplyId(tid)
    setEditId(0)
    openEditor(true)
  }

  const onEdit = async (tid: number) => {
    try {
      const res = await fetchTalkRaw(tid)
      const d: any = unwrap(res) || {}
      setText(String(d.raw ?? d.content ?? ''))
      setEditId(tid)
      setReplyId(0)
      openEditor(true)
    } catch {
      showNotify('Item not exist', 'err')
    }
  }

  const onDelete = async (tid: number) => {
    try {
      await operateTalk({ tid, type: 'del' })
      setItems((prev) => prev.filter((it) => it.tid !== tid))
      showNotify('Delete success!', 'succ')
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const onShowMore = async () => {
    const last = items[items.length - 1]
    try {
      const res = await fetchTalkList({ topic: key, order: -1, start: last?.time ?? 0 })
      const more = asArray<TalkMessageItem>(unwrap(res))
      if (more.length === 0) {
        setHasMore(false)
        return
      }
      setItems((prev) => [...prev, ...more])
    } catch {
      /* ignore */
    }
  }

  return (
    <Shell variant="wide" title={`Message - ${data.title || data.msg}`} css={['discuss.css']}>
      <div className="g_cont2 g_talk usermsg" id="g_talk">
        <div id="g_talk_input" style={{ display: editorShow ? 'block' : undefined }}>
          <div className="wrap">
            <div className="desc">Notice: You are in public talk, please use English</div>
            <div className="tool">
              <EditTool onPerform={onPerform} />
              <a href="#" className="btn" data-type="cancel" id="J_cancel" onClick={(e) => { e.preventDefault(); onCancel() }}>X</a>
            </div>
            <textarea
              ref={textareaRef}
              cols={80}
              rows={30}
              dir="ltr"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); void onSave() } }}
            ></textarea>
            <p>
              <a className="g_btn btn g_talk_new" data-type="save" id="g_talk_save" onClick={(e) => { e.preventDefault(); void onSave() }}>Reply</a>
            </p>
          </div>
        </div>

        {data.msg ? (
          <div className="g_talk_title">
            <p>Message to:&nbsp;{data.msg}</p>
          </div>
        ) : null}

        <div className="g_talk_tool">
          <div className="g_btn btn g_talk_new" data-type="new" onClick={(e) => { e.preventDefault(); onNew() }}><i></i>Reply</div>
        </div>

        {loading ? <LoadingBlock text="Loading..." /> : null}
        <ul id="g_talk_list">
          {items.map((item) => (
            <TalkItemView key={item.tid} item={item} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>

        <div
          id="g_talk_next"
          data-type="next"
          className="talk_btn btn"
          style={{ display: hasMore ? 'block' : undefined }}
          onClick={(e) => { e.preventDefault(); void onShowMore() }}
        >Show more</div>

        <div className="g_talk_new_rep" id="g_talk_new2">
          <p>Want to say something?</p>
          <div className="g_btn btn g_talk_new" data-type="new" onClick={(e) => { e.preventDefault(); onNew() }}><i></i>Reply</div>
        </div>
      </div>
    </Shell>
  )
}
