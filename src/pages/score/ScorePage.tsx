import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { asArray, num, Pager, showNotify, useLoad, floatFormat } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchScorePage, operateScore } from '../../network/legacy'
import { avatarUrl, modeLabel } from '../../utils/formatters'

/* score.html + score/chart.html + score/items.html：extended base.html（两栏 + Platforms 侧栏），交互 module/score */
type Rec = Record<string, any>
type ScoreData = {
  chart: Rec
  list: Rec[]
  backId: string
  isAdmin: boolean
  total: number
}
const FALLBACK: ScoreData = { chart: {}, list: [], backId: '', isAdmin: false, total: 1 }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))
const n = (v: unknown, fb = 0): number => num(v, fb)
const fmt2 = (v: unknown): string => floatFormat(v, 2)
const coverSrc = (v: unknown): string => {
  const raw = s(v)
  if (!raw) return staticUrl('img/cover.png')
  return raw.startsWith('http') || raw.startsWith('/') ? raw : `//cni.mugzone.net/${raw}`
}

export default function ScorePage() {
  const { pathname, search } = useLocation()
  const m = pathname.match(/^\/score\/(\d+)/)
  const chartId = m ? Number(m[1]) : 0
  const qFrom = new URLSearchParams(search).get('from')

  const [page, setPage] = useState(1)
  const [from, setFrom] = useState<number>(n(qFrom, 0))

  const { data, reload } = useLoad<ScoreData>(
    async () => {
      const res = (await fetchScorePage(chartId, page, from)) as Rec
      const d: Rec = (res?.data && !Array.isArray(res.data) && typeof res.data === 'object')
        ? (res.data as Rec)
        : {}
      return {
        chart: (d.chart ?? res.chart ?? {}) as Rec,
        list: asArray<Rec>(d.data ?? d.list ?? d.items ?? res.data ?? res.list ?? res),
        backId: s(d.back_id ?? res.back_id),
        isAdmin: Boolean(d.isAdmin ?? res.isAdmin),
        total: Math.max(1, n(d.total ?? res.total, 1)),
      }
    },
    [chartId, page, from],
    FALLBACK,
  )

  const clearAll = async () => {
    if (!window.confirm('Are you sure to do this?')) return
    try {
      const res = await operateScore({ chart_id: chartId, type: 'clear' })
      const rc = res?.code
      if (rc !== undefined && Number(rc) !== 0) {
        showNotify('Delete failed', 'err')
        return
      }
      reload()
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const deleteMy = async () => {
    if (!window.confirm('Delete score is unrecoverable, sure to continue?')) return
    try {
      const res = await operateScore({ chart_id: chartId, from, type: 'delmy' })
      const rc = res?.code
      if (rc !== undefined && Number(rc) !== 0) {
        // module/score init.js：-3 本周已删过，-2 无删除权限
        const code = Number(rc)
        const msg = code === -3 ? 'You have deleted score this week'
          : code === -2 ? 'You have no permission to delete score'
          : 'Delete failed'
        showNotify(msg, 'err')
        return
      }
      reload()
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const changeFrom = (f: number) => {
    setFrom(f)
  }

  const chart = data.chart
  const song: Rec = (chart.song ?? {}) as Rec

  const sidebar = (
    <>
      <h4>Platforms</h4>
      <div className="option">
        <a href={`${URLS.score(chartId)}?from=0`} onClick={(e) => { e.preventDefault(); changeFrom(0) }}>Windows &amp; Mac</a>
        <a href={`${URLS.score(chartId)}?from=2`} onClick={(e) => { e.preventDefault(); changeFrom(2) }}>iOS &amp; Android</a>
      </div>
    </>
  )

  return (
    <Shell variant="two-col" title="Ranking" css={['score.css']} contCls="" sidebar={sidebar}>
      <div className="g_title">Ranking:&nbsp;{s(song.title)} - {s(chart.version)}</div>
      <div className="g_cont" data-id={chartId}>
        <div className="g_actbar">
          {data.backId && <a href={URLS.chartPage(data.backId)} className="g_btn">Back to chart</a>}
          {data.isAdmin && (
            <a href="#" className="g_btn btn" data-type="del" onClick={(e) => { e.preventDefault(); void clearAll() }}>Clear All Records</a>
          )}
          <a href="#" className="g_btn btn" data-type="delmy" onClick={(e) => { e.preventDefault(); void deleteMy() }}>Remove score</a>
        </div>

        {/* score/chart.html */}
        <div className="g_temp temp song">
          <div className="bg">
            <h1>Chart information</h1>
            {song.cover && <div className="left g_cover" style={{ backgroundImage: `url(${coverSrc(song.cover_url ?? song.cover)})` }}></div>}
            <div className="right">
              <h2><label>Title</label><span className="textfix">{s(song.title)}</span></h2>
              <h2><label>Artist</label><span className="textfix">{s(song.artist)}</span></h2>
              <h2><label>Version</label><span>{s(chart.version)}</span></h2>
              <h2><label>Mode</label><span>{modeLabel(chart.mode)}</span></h2>
              <h2><label>Release Date</label><span>{s(chart.lastedit_str)}</span></h2>
            </div>
          </div>
        </div>

        {data.list.length > 0 ? (
          <>
            <div className="g_memo">
              <span className="g_round">{from === 2 ? 'Scores from iOS or Android' : 'Scores from Windows & Mac'}</span>
            </div>
            {/* score/items.html */}
            <div className="list_head">
              <span className="rank">Rank</span>
              <span className="name">Player</span>
              <span className="score">Score</span>
              <span className="combo">Combo</span>
              <span className="acc">Acc.</span>
              <span className="mod">Mod</span>
              <span className="time">Achieved</span>
            </div>
            <ul className="list">
              {data.list.map((item: Rec, i: number) => {
                const u: Rec = (item.user ?? item) as Rec
                const uid = item.user_id ?? u.id ?? 0
                return (
                  <li className="" title={`${s(item.best)}/${s(item.cool)}/${s(item.good)}/${s(item.miss)}`} key={i}>
                    <span className="rank"><img className="g_round" src={avatarUrl(u.avatar, uid)} alt={s(u.username)} /></span>
                    {i < 3
                      ? <i className={`label top-${i + 1}`}></i>
                      : <i className="ranknum">{i + 1}</i>}
                    <span className="name textfix"><a href={URLS.user(uid)}>{s(u.username)}</a></span>
                    <span className="score">{s(item.score)}</span>
                    <span className="combo">{s(item.combo)}</span>
                    <span className="acc">
                      <i className={`g_round color-${n(item.judge)}`} style={{ width: `${n(item.acc)}%` }}></i>
                      <em>{fmt2(item.acc)}%</em>
                    </span>
                    <span className="mod">{s(item.mod ?? item.mods)}</span>
                    <span className="time textfix">{s(item.time_str)}</span>
                    {data.isAdmin && (
                      <span className="combo"><a target="_blank" rel="noreferrer" href={`/score/dscore?touid=${uid}&cid=${chartId}`}>Remove</a></span>
                    )}
                  </li>
                )
              })}
            </ul>
            <Pager page={page} total={data.total} onChange={(p: number) => { setPage(p) }} />
          </>
        ) : (
          <div className="g_memo"><span className="g_round">No Score Currently</span></div>
        )}
      </div>
    </Shell>
  )
}
