import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { LoadingBlock, num, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import {
  fetchEventCharts,
  fetchEventRanking,
  fetchStoreEvents,
  type RespEventChartItem,
  type RespRankingEventItem,
  type RespStoreEventItem,
} from '../../network/api'
import { buildEventStatus, parseEventDate, type EventStatus } from '../../utils/events'
import { chartTypeBadge, coverUrl, modeLabel } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'
import './Event.css'

type InfoData = { info?: RespStoreEventItem; error: string }

const EMPTY_INFO: InfoData = { error: '' }

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

const typeLabel = (value?: string | number): string => {
  const keys = ['Default', 'Section', 'New default', 'New section', 'Combo']
  const index = num(value, -1)
  return index >= 0 && index < keys.length ? i18nT(keys[index]) : i18nT('Unknown')
}

export default function EventDetail() {
  const { search } = useLocation()
  const { isLogin } = useSession()
  const params = new URLSearchParams(search)
  const eid = num(params.get('eid') ?? params.get('id'), 0)

  const { data: infoData, loading: infoLoading, error: infoError } = useLoad<InfoData>(
    async () => {
      if (!eid) return { error: i18nT('Event not found') }
      let from = 0
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const resp = await fetchStoreEvents({ active: 0, from })
        if (resp.code !== 0 || !resp.data) return { error: i18nT('Failed to load events') }
        const found = resp.data.find((item) => item.eid === eid)
        if (found) return { info: found, error: '' }
        if (!resp.hasMore || resp.next === undefined) break
        from = resp.next
      }
      return { error: i18nT('Event not found') }
    },
    [eid],
    EMPTY_INFO,
  )

  const { data: charts, loading: chartsLoading, error: chartsError } = useLoad<RespEventChartItem[]>(
    async () => {
      if (!eid) return []
      const resp = await fetchEventCharts({ eid })
      return resp.code === 0 && resp.data ? resp.data : []
    },
    [eid],
    [] as RespEventChartItem[],
  )

  const scoreId = infoData.info ? num(infoData.info.scoreId ?? infoData.info.scoreID, 0) : 0

  const { data: ranking, loading: rankingLoading, error: rankingError } = useLoad<RespRankingEventItem[]>(
    async () => {
      if (!scoreId) return []
      const resp = await fetchEventRanking({ eid: scoreId })
      return resp.code === 0 && resp.data ? resp.data : []
    },
    [scoreId],
    [] as RespRankingEventItem[],
  )

  const info = infoData.info
  const status = buildEventStatus(info?.start, info?.end)
  const cover = coverUrl(info?.cover)

  const sidebar = (
    <>
      <h4>{i18nT('Events')}</h4>
      <div className="option">
        <a href={URLS.event}>{i18nT('Back to events')}</a>
        {isLogin && eid > 0 && <a href={URLS.eventEdit(eid)}>{i18nT('Edit event')}</a>}
        {scoreId > 0 && <a href={URLS.eventRank(scoreId)}>{i18nT('Event rank')}</a>}
      </div>
    </>
  )

  return (
    <Shell variant="two-col" title={info?.name ?? i18nT('Events')} page="event" css={['score.css']} contCls="" sidebar={sidebar}>
      <div className="g_title textfix">{info?.name ?? i18nT('Events')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a className="g_btn" href={URLS.event}>{i18nT('Back to events')}</a>
          {isLogin && eid > 0 && <a className="g_btn btn" href={URLS.eventEdit(eid)}>{i18nT('Edit event')}</a>}
          {scoreId > 0 && <a className="g_btn btn" href={URLS.eventRank(scoreId)}>{i18nT('Event rank')}</a>}
        </div>

        {infoLoading && !info && <LoadingBlock />}
        {(infoData.error || infoError) && <p className="event_msg">{infoData.error || i18nT('Failed to load events')}</p>}

        <div className="event_hero">
          <div className="event_hero_cover" style={{ backgroundImage: `url(${cover})` }}></div>
          <div className="event_hero_info">
            <h3 className="textfix">{info?.name ?? i18nT('Unknown')}</h3>
            <div className="event_meta_row">
              <span className={`event_tag ${status === 'ongoing' ? 'solid' : 'muted'}`}>{statusLabel(status)}</span>
              <span className="event_tag">{formatDate(info?.start)} — {formatDate(info?.end)}</span>
              <span className="event_tag">{i18nT('Type')}: {typeLabel(info?.type)}</span>
              <span className="event_tag">#{eid}</span>
            </div>
            {info?.wiki ? <a href={URLS.wiki(info.wiki)}>{i18nT('Wiki page')}</a> : null}
          </div>
        </div>

        <div className="event_section">
          <p className="label">{i18nT('Event charts')}</p>
          {chartsLoading && charts.length === 0 && <LoadingBlock />}
          {!chartsLoading && charts.length === 0 && (
            <div className="g_memo"><span className="g_round">{i18nT('No charts')}</span></div>
          )}
          <div className="event_chart_grid">
            {chartsError && <p className="event_msg">{i18nT('Operation failed')}</p>}
            {charts.map((chart) => {
              const badge = chartTypeBadge(chart.type)
              const typeCls = chart.type === 0 ? 'alpha' : chart.type === 1 ? 'beta' : chart.type === 2 ? 'stable' : ''
              return (
                <a className="event_chart_card" href={URLS.chartPage(chart.cid)} key={chart.cid}>
                  <div className="event_chart_cover" style={{ backgroundImage: `url(${coverUrl(chart.cover)})` }}></div>
                  <div className="event_chart_body">
                    <div className="event_chart_title textfix">{chart.title ?? i18nT('Unknown')}</div>
                    <div className="event_chart_artist textfix">{chart.artist ?? i18nT('Unknown')}</div>
                    <div className="event_chart_tags">
                      {chart.mode !== undefined && <span className="event_tag">{modeLabel(chart.mode)}</span>}
                      {chart.version && <span className="event_tag">{chart.version}</span>}
                      {chart.level !== undefined && <span className="event_tag">Lv.{chart.level}</span>}
                      {badge && <span className={`event_tag ${typeCls}`}>{badge.label}</span>}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>

        <div className="event_section event_rank">
          <p className="label">{i18nT('Event ranking')}</p>
          {rankingLoading && ranking.length === 0 && <LoadingBlock />}
          {rankingError && <p className="event_msg">{i18nT('Operation failed')}</p>}
          {!rankingLoading && !rankingError && ranking.length === 0 && (
            <div className="g_memo"><span className="g_round">{i18nT('No ranking')}</span></div>
          )}
          {ranking.length > 0 && (
            <>
              <div className="list_head">
                <span className="rank">{i18nT('Rank')}</span>
                <span className="name">{i18nT('Player')}</span>
                <span className="score">{i18nT('Score')}</span>
              </div>
              <ul className="list">
                {ranking.map((row, i) => (
                  <li key={`${row.uid}-${i}`}>
                    <span className="rank">{row.index ?? i + 1}</span>
                    <span className="name textfix"><a href={URLS.user(row.uid)}>{row.username ?? `#${row.uid}`}</a></span>
                    <span className="score">{row.score ?? 0}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
