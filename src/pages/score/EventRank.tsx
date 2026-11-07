import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { asArray, num, Pager, useLoad } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchEventRank } from '../../network/legacy'
import { avatarUrl } from '../../utils/formatters'

/* score/event_rank.html：extended base_width.html，含 wiki/tmpl_event_chart.html 与 wiki/tmpl_eventsum.html */
type Rec = Record<string, any>
type EventRankData = {
  record: Rec
  charts: Rec[]
  list: Rec[]
  cover: string
  total: number
}
const FALLBACK: EventRankData = { record: {}, charts: [], list: [], cover: '', total: 1 }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))
const n = (v: unknown, fb = 0): number => num(v, fb)
const coverSrc = (v: unknown): string => {
  const raw = s(v)
  if (!raw) return staticUrl('img/cover.png')
  return raw.startsWith('http') || raw.startsWith('/') ? raw : `//cni.mugzone.net/${raw}`
}

export default function EventRank() {
  const { pathname } = useLocation()
  const m = pathname.match(/^\/score\/event_rank\/(\d+)/)
  const eid = m ? Number(m[1]) : 0

  const [page, setPage] = useState(1)

  const { data } = useLoad<EventRankData>(
    async () => {
      const res = (await fetchEventRank(eid, page)) as Rec
      const d: Rec = (res?.data && !Array.isArray(res.data) && typeof res.data === 'object')
        ? (res.data as Rec)
        : {}
      return {
        record: (d.record ?? res.record ?? {}) as Rec,
        charts: asArray<Rec>(d.charts ?? res.charts ?? d.data ?? []),
        list: asArray<Rec>(d.list ?? d.rank ?? res.list ?? []),
        cover: s(d.cover ?? res.cover),
        total: Math.max(1, n(d.total ?? res.total, 1)),
      }
    },
    [eid, page],
    FALLBACK,
  )

  const record = data.record

  return (
    <Shell variant="wide" title={s(record.name) || 'Event record'} css={['wiki.css', 'tmpl.css']} contCls="">
      <div className="song_title g_rblock">
        <div className="coverb">
          <div className="cover" style={{ backgroundImage: `url(${coverSrc(data.cover)})` }}></div>
        </div>
        <div className="right">
          <h2 className="textfix title"><span className="textfix artist">{s(record.name)}</span></h2>
          <h2 className="sub"> </h2>
          <h2 className="sub">
            <label>From</label>:<span>{s(record.start_time)} (UTC)</span>&nbsp;&nbsp;
            <label>To</label>:<span>{s(record.end_time)} (UTC)</span>
          </h2>
        </div>
        <div className="tool"></div>
      </div>

      <div className="g_cont2 g_rblock" style={{ textAlign: 'left' }}>
        {data.charts.map((item: Rec, i: number) => {
          const chart: Rec = (item.chart ?? item) as Rec
          const song: Rec = (chart.song ?? {}) as Rec
          return (
            <div className="g_tmpl_event" key={i}>
              <a href={URLS.chartPage(chart.id)} style={{ backgroundImage: `url(${coverSrc(song.cover_url ?? song.cover)})` }}></a>
              <div className="right">
                <p className="title textfix">
                  <img src={staticUrl(`img/mode/mode-${n(chart.mode)}.png`)} alt="mode" />
                  <span className="textfix" style={{ maxWidth: '150px' }}>{s(song.title)}</span>-{s(chart.version)}
                </p>
                {Boolean(item.finish) && <span className="fin">Complete</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="g_cont2 g_rblock">
        <div className="g_wiki">
          <span className="clear"></span>
          <div className="score_area" style={{ display: 'inline-block' }}>
            <div className="list_head">
              <span className="rank">Rank</span>
              <span className="name">Player</span>
              <span className="score">Score</span>
            </div>
            <ul className="list">
              {data.list.map((item: Rec, i: number) => {
                const uid = item.user_id ?? item.uid ?? item.user ?? 0
                const name = s(item.user_id__username ?? item.username ?? item.name)
                return i > 2 ? (
                  <li key={i}>
                    <span className="rank">{i + 1}</span>
                    <span className="name textfix"><a href={URLS.user(uid)}>{name}</a></span>
                    <span className="score">{s(item.total ?? item.score)}</span>
                  </li>
                ) : (
                  <li className="top" key={i}>
                    <span className="rank"><img className="g_round" src={avatarUrl(item.avatar, uid)} alt={name} /></span>
                    <i className={`label top-${i + 1}`}></i>
                    <span className="name textfix"><a href={URLS.user(uid)}>{name}</a></span>
                    <span className="score">{s(item.total ?? item.score)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <span className="clear"></span>
        </div>
      </div>

      <Pager page={page} total={data.total} onChange={(p: number) => { setPage(p) }} />
    </Shell>
  )
}
