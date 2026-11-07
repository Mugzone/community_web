import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, formatTime, num, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchTalkInbox } from '../../network/legacy'
import { getJson } from '../../network/api'
import { t as i18nT } from '../../i18n'

/** talk/user_topics.html + talk/user_topic_item.html */
type TopicUserItem = {
  meta?: { count?: number | string }
  host_user?: { id?: number | string; username?: string }
  send_user?: { id?: number | string; username?: string }
  last_reply_str?: string
  last_reply?: number | string
}
type TalkUserState = {
  items: TopicUserItem[] | null
  total: number
  page: number
  prev: number | null
  next: number | null
  guest: number
  lang: number
  user: { id?: number | string }
}

const EMPTY: TalkUserState = {
  items: null,
  total: 1,
  page: 1,
  prev: null,
  next: null,
  guest: 0,
  lang: 0,
  user: {},
}

const unwrap = (res: any): any => {
  if (!res || typeof res !== 'object') return {}
  const d = (res as any).data
  return d !== undefined && d !== null ? d : res
}

const normalize = (res: any, guest: number): TalkUserState => {
  const d: any = unwrap(res) || {}
  return {
    items: Array.isArray(d.items) ? d.items : null,
    total: num(d.total, 1),
    page: num(d.page, 1),
    prev: d.prev === undefined || d.prev === null ? null : num(d.prev),
    next: d.next === undefined || d.next === null || d.next === 0 ? null : num(d.next),
    guest: num(d.guest, guest),
    lang: num(d.lang, 0),
    user: d.user ?? {},
  }
}

function TopicUserItemView({ item, guest }: { item: TopicUserItem; guest: number }) {
  const host = item.host_user ?? {}
  const send = item.send_user ?? {}
  const href = `/talk/user/${host.id ?? 0}/${send.id ?? 0}`
  return (
    <div className="item">
      <div className="name">
        <div className="num">{item.meta?.count ?? ''}</div>
        <span>{i18nT('Replies')}</span>
      </div>
      <div className="right">
        {guest ? (
          <p className="title">To <a href={href}>{host.username ?? ''}</a></p>
        ) : (
          <p className="title">From <a href={href}>{send.username ?? ''}</a></p>
        )}
      </div>
      <div className="time">{item.last_reply_str ?? formatTime(item.last_reply)}</div>
      <span className="clear"></span>
    </div>
  )
}

export default function TalkUser() {
  const [page, setPage] = useState(1)
  const [guest, setGuest] = useState(0)

  const { data, loading } = useLoad<TalkUserState>(
    async () => {
      const res = await fetchTalkInbox(page)
      // 老站 Outbox 走 /talk/user?guest=1，fetchTalkInbox 只暴露 page，故补一次带 guest 的请求
      if (guest === 1) {
        const out = await getJson<any>('/talk/user', { params: { page, guest: 1 } })
        return normalize(out, guest)
      }
      return normalize(res, guest)
    },
    [page, guest],
    EMPTY,
  )

  const gotoPage = (p: number) => {
    setPage(p)
  }
  const switchBox = (g: number) => {
    setGuest(g)
    setPage(1)
  }

  const pageUrl = (p: number) => `${URLS.talkUser}?page=${p}&lang=${data.lang}&guest=${guest}`

  return (
    <Shell title={i18nT('Private messages')} css={['board.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">{i18nT('Private messages')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a className="g_btn" href={URLS.user(data.user?.id ?? 0)}>{i18nT('Back')}</a>
          <a
            href={URLS.talkUser}
            className="g_btn"
            onClick={(e) => { e.preventDefault(); switchBox(0) }}
          >Inbox</a>
          <a
            href={`${URLS.talkUser}?guest=1`}
            className="g_btn"
            onClick={(e) => { e.preventDefault(); switchBox(1) }}
          >Outbox</a>
        </div>

        {loading ? <LoadingBlock text="Loading..." /> : null}

        {data.items === null ? (
          <div className="g_memo"><span className="g_round">{i18nT('No Recent Topics')}</span></div>
        ) : (
          <div className="discuss">
            {data.items.map((item, i) => (
              <TopicUserItemView key={i} item={item} guest={guest} />
            ))}
          </div>
        )}

        {data.total > 1 ? (
          <div className="g_more">
            {data.prev !== null ? (
              <a
                href={pageUrl(data.prev)}
                className="g_round"
                onClick={(e) => { e.preventDefault(); gotoPage(data.prev as number) }}
              >{i18nT('Prev')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{data.page}/{data.total}</span>
            {data.next !== null ? (
              <a
                href={pageUrl(data.next)}
                className="g_round"
                onClick={(e) => { e.preventDefault(); gotoPage(data.next as number) }}
              >{i18nT('Next')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        ) : null}
      </div>
    </Shell>
  )
}
