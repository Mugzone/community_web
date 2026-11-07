import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { asArray, num, useLoad, floatFormat } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchEventPage } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

/* score/event3.html 与 score/event.html：extended base.html（两栏 + 默认侧栏），两个视图共用 fetchEventPage */
type Rec = Record<string, any>
type EventData = { players: Rec[]; records: Rec[]; back: string }
const FALLBACK: EventData = { players: [], records: [], back: '' }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))
const n = (v: unknown, fb = 0): number => num(v, fb)
const fmt2 = (v: unknown): string => floatFormat(v, 2)

export default function EventPage() {
  const { pathname } = useLocation()
  const m = pathname.match(/^\/score\/event\/(\d+)/)
  const eid = m ? Number(m[1]) : 0

  const [view, setView] = useState<'players' | 'records'>('players')

  const { data } = useLoad<EventData>(
    async () => {
      const res = (await fetchEventPage(eid)) as Rec
      const d: Rec = (res?.data && !Array.isArray(res.data) && typeof res.data === 'object')
        ? (res.data as Rec)
        : {}
      return {
        players: asArray<Rec>(d.score ?? d.rank ?? d.players ?? res.score ?? []),
        records: asArray<Rec>(d.list ?? d.records ?? d.recent ?? res.list ?? []),
        back: s(d.back ?? res.back),
      }
    },
    [eid],
    FALLBACK,
  )

  const switchView = (v: 'players' | 'records') => {
    setView(v)
  }

  return (
    <Shell variant="two-col" title={i18nT('Event record')} css={['score.css']} contCls="" sidebar={<DefaultSidebar />}>
      <div className="g_title">{i18nT('Event record')}</div>
      <div className="g_cont">
        {data.back && (
          <div className="g_actbar"><a href={data.back} className="g_btn">{i18nT('Back')}</a></div>
        )}

        <div className="option g_rblock">
          <a href="#" className={`btn ${view === 'players' ? 'curr' : ''}`} onClick={(e) => { e.preventDefault(); switchView('players') }}>{i18nT('Players')}</a>
          <a href="#" className={`btn ${view === 'records' ? 'curr' : ''}`} onClick={(e) => { e.preventDefault(); switchView('records') }}>Records</a>
        </div>

        {view === 'players' ? (
          /* score/event3.html */
          <>
            <div className="list_head" style={{ width: '300px' }}>
              <span className="chart">{i18nT('Player')}</span>
              <span className="score">Points</span>
            </div>
            <ul className="list">
              {data.players.map((item: Rec, i: number) => {
                const u: Rec = (item.user ?? item) as Rec
                return (
                  <li style={{ width: '300px' }} key={i}>
                    <span className="chart textfix"><a href={URLS.user(u.id ?? item.user_id ?? 0)}>{s(u.username)}</a></span>
                    <span className="score">{s(item.val ?? item.score ?? item.total)}</span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          /* score/event.html + score/event_item.html */
          data.records.length > 0 ? (
            <>
              <div className="list_head">
                <span className="chart">{i18nT('Chart')}</span>
                <span className="score">{i18nT('Score')}</span>
                <span className="combo">{i18nT('Combo')}</span>
                <span className="acc">{i18nT('Acc.')}</span>
                <span className="mod">{i18nT('Mod')}</span>
                <span className="time">{i18nT('Achieved')}</span>
              </div>
              <ul className="list">
                {data.records.map((item: Rec, i: number) => {
                  const chart: Rec = (item.chart ?? {}) as Rec
                  const song: Rec = (chart.song ?? {}) as Rec
                  return (
                    <li title={`${s(item.best)}/${s(item.cool)}/${s(item.good)}/${s(item.miss)}`} key={i}>
                      <span className="chart textfix"><a href={URLS.chartPage(item.chart_id ?? chart.id)}>{s(song.title)}</a></span>
                      <span className="score">{s(item.score)}</span>
                      <span className="combo">{s(item.combo)}</span>
                      <span className="acc">
                        <i className={`g_round color-${n(item.judge)}`} style={{ width: `${n(item.acc)}%` }}></i>
                        <em>{fmt2(item.acc)}%</em>
                      </span>
                      <span className="mod">None</span>
                      <span className="time textfix">{s(item.time_from_now)}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <div className="g_memo"><span className="g_round">{i18nT('No record Currently')}</span></div>
          )
        )}
      </div>
    </Shell>
  )
}
