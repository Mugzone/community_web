import { useEffect, useState } from 'react'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { LoadingBlock, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchStoreEvents, type RespStoreEventItem } from '../../network/api'
import { buildEventStatus, parseEventDate, type EventStatus } from '../../utils/events'
import { coverUrl } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'
import './Event.css'

type EventBatch = {
  items: RespStoreEventItem[]
  hasMore: boolean
  next?: number
  from: number
  failed: boolean
}

const EMPTY: EventBatch = { items: [], hasMore: false, from: 0, failed: false }

const statusLabel = (status: EventStatus): string => {
  if (status === 'upcoming') return i18nT('Upcoming')
  if (status === 'ongoing') return i18nT('Ongoing')
  if (status === 'ended') return i18nT('Ended')
  return i18nT('Unknown')
}

const formatDate = (value?: string | number): string => {
  const parsed = parseEventDate(value)
  return parsed ? parsed.toLocaleDateString() : i18nT('Unknown')
}

export default function EventList() {
  const { isLogin } = useSession()
  const [activeOnly, setActiveOnly] = useState(true)
  const [from, setFrom] = useState(0)
  const [retry, setRetry] = useState(0)
  const [items, setItems] = useState<RespStoreEventItem[]>([])

  const { data, loading } = useLoad<EventBatch>(
    async () => {
      try {
        const resp = await fetchStoreEvents({ active: activeOnly ? 1 : 0, from })
        if (resp.code !== 0 || !resp.data) return { items: [], hasMore: true, next: from, from, failed: true }
        return { items: resp.data, hasMore: Boolean(resp.hasMore), next: resp.next, from, failed: false }
      } catch {
        return { items: [], hasMore: true, next: from, from, failed: true }
      }
    },
    [activeOnly, from, retry],
    EMPTY,
  )

  useEffect(() => {
    if (data.failed) return
    setItems((prev) => {
      const merged = data.from === 0 ? data.items : [...prev, ...data.items]
      return merged.filter((item, i, arr) => arr.findIndex((x) => x.eid === item.eid) === i)
    })
  }, [data])

  const changeFilter = (value: boolean) => {
    setItems([])
    setActiveOnly(value)
    setFrom(0)
  }

  const onMore = () => {
    if (loading) return
    if (data.failed) setRetry((v) => v + 1)
    else if (data.next !== undefined) setFrom(data.next)
  }

  const sidebar = (
    <>
      <h4>{i18nT('Events')}</h4>
      <div className="option">
        <a href={URLS.event} className={activeOnly ? 'curr' : ''} onClick={(e) => { e.preventDefault(); changeFilter(true) }}>{i18nT('Active only')}</a>
        <a href={URLS.event} className={!activeOnly ? 'curr' : ''} onClick={(e) => { e.preventDefault(); changeFilter(false) }}>{i18nT('All events')}</a>
        {isLogin && <a href={URLS.eventEdit()}>{i18nT('Create event')}</a>}
      </div>
    </>
  )

  return (
    <Shell variant="two-col" title={i18nT('Events')} page="event" contCls="" sidebar={sidebar}>
      <div className="g_title">{i18nT('Events')}</div>
      <div className="g_cont">
        <div className="event_tools">
          {isLogin && <a className="g_btn" href={URLS.eventEdit()}>{i18nT('Create event')}</a>}
          <div className="g_memo"><span className="g_round">{i18nT('{{count}} events', { count: items.length })}</span></div>
        </div>

        {loading && from === 0 && <LoadingBlock />}
        {data.failed && <p className="event_msg">{i18nT('Failed to load events')}</p>}
        {!data.failed && !loading && items.length === 0 && (
          <div className="g_memo"><span className="g_round">{i18nT('No events')}</span></div>
        )}

        <div className="event_grid">
          {items.map((item) => {
            const status = buildEventStatus(item.start, item.end)
            const link = item.wiki ? URLS.wiki(item.wiki) : URLS.eventDetail(item.eid)
            return (
              <a className="event_card" href={link} key={item.eid}>
                <div className="event_cover" style={{ backgroundImage: `url(${coverUrl(item.cover)})` }}>
                  <span className={`event_pill ${status}`}>{statusLabel(status)}</span>
                </div>
                <div className="event_card_body">
                  <div className="event_card_title textfix">{item.name ?? i18nT('Unknown')}</div>
                  <div className="event_card_meta">{formatDate(item.start)} — {formatDate(item.end)}</div>
                </div>
              </a>
            )
          })}
        </div>

        {data.hasMore && data.next !== undefined && (
          <div className="event_more">
            <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); onMore() }}>
              {loading ? i18nT('Loading') : data.failed ? i18nT('Retry') : i18nT('Load more')}
            </a>
          </div>
        )}
      </div>
    </Shell>
  )
}
