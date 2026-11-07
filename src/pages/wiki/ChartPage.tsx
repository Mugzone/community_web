import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, num, formatTime, showNotify, LoadingBlock, JustifyRow, floatFormat } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchChartInfo, fetchRankingList, fetchChartDonateList, fetchWiki } from '../../network/api'
import { fetchChartPage, fetchWikiLang, operateWikiPage, operateScore } from '../../network/legacy'
import { bindHiddenToggles } from '../../utils/wiki'
import { avatarUidUrl } from '../../utils/formatters'
import { wikiToHtml, useWikiHtml, LangTabs, TalkWidget } from './WikiPage'

/* ------------------------------------------------------------------ *
 * wiki/wiki_page_chart.html（base_width.html 宽版）+ module/wiki
 * ------------------------------------------------------------------ */

type ScoreRow = {
  uid?: number | string
  username?: string
  score?: number | string
  combo?: number | string
  acc?: number | string
  judge?: number
  mod?: number | string
  time?: number | string
  time_str?: string
  best?: number | string
  cool?: number | string
  good?: number | string
  miss?: number | string
  user?: { id?: number | string; username?: string }
  user_id?: number | string
}
type DonateRow = {
  uid?: number | string
  username?: string
  gold?: number | string
  user?: { id?: number | string; username?: string }
}
type TagRow = { id?: number | string; name?: string }
type ChartState = {
  chart: Record<string, any>
  song: Record<string, any>
  songEx: { title: string; artist: string; hasOrg: boolean }
  tags: TagRow[]
  donate: DonateRow[]
  percent: number
  gold: number
  stat: Record<string, any> | null
  wikiRaw: string
  canMark: boolean
  canTop: boolean
  canDel: boolean
  canMerge: boolean
  canEdit: boolean
  sid: number | string
}
const EMPTY_CHART: ChartState = {
  chart: {},
  song: {},
  songEx: { title: '', artist: '', hasOrg: false },
  tags: [],
  donate: [],
  percent: -1,
  gold: 0,
  stat: null,
  wikiRaw: '',
  canMark: true,
  canTop: true,
  canDel: true,
  canMerge: true,
  canEdit: true,
  sid: 0,
}

const percentLabel = (v: number): string => {
  if (v < 0) return 'N/A'
  if (v >= 99) return 'Masterpiece'
  if (v >= 90) return 'Very Positive'
  if (v >= 80) return 'Positive'
  if (v >= 60) return 'Mostly Positive'
  if (v >= 40) return 'Mixed'
  if (v >= 30) return 'Mostly Negative'
  if (v >= 20) return 'Negative'
  return 'Very Negative'
}

/** wiki/tmpl_first.html —— 首个达成者 */
function FirstBlock({ user, time, pic }: { user: any; time: string; pic: string }) {
  return (
    <div className="g_tmpl_first g_rblock">
      <img className="logo" src={staticUrl(`img/${pic}`)} alt="" />
      {user ? (
        <>
          <span className="avatar"><img src={avatarUidUrl(Number(user.id ?? user.uid ?? 0))} alt="" /></span>
          <div className="right">
            <a href={URLS.user(user.id ?? user.uid ?? 0)}>{user.username ?? ''}</a>
            <p>{time}</p>
          </div>
        </>
      ) : (
        <div className="empty">Empty</div>
      )}
    </div>
  )
}

/** score/items.html —— 成绩排名列表 */
function ScoreList({ rows }: { rows: ScoreRow[] }) {
  return (
    <>
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
        {rows.map((row, i) => {
          const uid = row.uid ?? row.user?.id ?? row.user_id ?? 0
          const name = row.username ?? row.user?.username ?? ''
          const acc = num(row.acc, 0)
          return (
            <li
              key={`${uid}-${i}`}
              className=""
              title={`${row.best ?? ''}/${row.cool ?? ''}/${row.good ?? ''}/${row.miss ?? ''}`}
            >
              <span className="rank"><img src={avatarUidUrl(Number(uid))} alt="" /></span>
              {i < 3
                ? <i className={`label top-${i + 1}`}></i>
                : <i className="ranknum">{i + 1}</i>}
              <span className="name textfix"><a href={URLS.user(uid)}>{name}</a></span>
              <span className="score">{row.score ?? ''}</span>
              <span className="combo">{row.combo ?? ''}</span>
              <span className="acc">
                <i className={`g_round color-${row.judge ?? 0}`} style={{ width: `${acc}%` }}></i>
                <em>{floatFormat(row.acc)}%</em>
              </span>
              <span className="mod">{row.mod ?? ''}</span>
              <span className="time textfix">{row.time_str ?? formatTime(row.time)}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function ChartPage() {
  const params = useParams<{ id?: string }>()
  const id = params.id
    ?? new URLSearchParams(window.location.search).get('id')
    ?? window.location.pathname.match(/\/(\d+)\/?$/)?.[1]
    ?? ''
  const keyFromQuery = new URLSearchParams(window.location.search).get('key')
  const key = keyFromQuery || `chart_${id}`

  const [judge, setJudge] = useState<number>(-1)
  const [platform, setPlatform] = useState<number>(1)

  const { data, loading } = useLoad<ChartState>(
    async () => {
      const cid = Number(id) || 0
      const [pageR, infoR, donateR, wikiR] = await Promise.all([
        fetchChartPage(String(id)).catch(() => ({})),
        fetchChartInfo({ cid }).catch(() => ({})),
        fetchChartDonateList({ cid }).catch(() => ({})),
        fetchWiki({ cid, lang: 0, raw: 1 }).catch(() => ({})),
      ])
      const p: any = (pageR as any)?.data ?? pageR ?? {}
      const info: any = infoR ?? {}
      const chart: Record<string, any> = { ...info, ...(p.chart ?? {}) }
      const song: Record<string, any> = p.song ?? {}
      const songExRaw: any = p.song_ex ?? {}
      const songTitle = String(song.title ?? info.title ?? '')
      const songArtist = String(song.artist ?? info.artist ?? '')
      const tags: TagRow[] = asArray<any>(p.taglist ?? info.tagOptions ?? []).map((t: any) => {
        const inner = t?.tag ?? t
        return { id: inner?.id ?? t?.id, name: inner?.name ?? t?.name }
      })
      return {
        chart,
        song,
        songEx: {
          title: String(songExRaw.title ?? info.titleOrg ?? songTitle),
          artist: String(songExRaw.artist ?? info.artistOrg ?? songArtist),
          hasOrg: Boolean(songExRaw.hasOrg) || (Boolean(info.titleOrg) && info.titleOrg !== info.title),
        },
        tags,
        donate: asArray<DonateRow>((donateR as any)?.data ?? p.donate ?? donateR),
        percent: num(p.percent, -1),
        gold: num(p.gold, 0),
        stat: (p.stat ?? null) as Record<string, any> | null,
        wikiRaw: String((wikiR as any)?.wiki ?? p.content ?? ''),
        canMark: p.canMark !== false,
        canTop: p.canTop !== false,
        canDel: p.canDel !== false,
        canMerge: p.canMerge !== false,
        canEdit: p.canEdit !== false,
        sid: chart.sid ?? song.id ?? 0,
      }
    },
    [id],
    EMPTY_CHART,
  )

  const { data: scores, reload: reloadScores } = useLoad<ScoreRow[]>(
    async () => {
      const resp: any = await fetchRankingList({ cid: Number(id) || 0, order: judge, pro: platform })
      return asArray<ScoreRow>(resp?.data ?? resp?.items ?? resp)
    },
    [id, judge, platform],
    [] as ScoreRow[],
  )

  const wikiHtml = useWikiHtml(data.wikiRaw)
  const [lang, setLang] = useState<string>('en')
  const [langHtml, setLangHtml] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

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

  const onTool = async (type: string): Promise<void> => {
    if (type === 'edit') { onEdit(); return }
    if (type === 'edit_meta') {
      window.location.href = `/wiki/meta?key=${encodeURIComponent(key)}`
      return
    }
    if (type === 'delall' || type === 'delmy') {
      if (!window.confirm('Are you sure to do this?')) return
      try {
        await operateScore({ chart_id: Number(id) || 0, type: type === 'delall' ? 'clear' : 'delmy' })
        reloadScores()
      } catch { showNotify('Delete failed', 'err') }
      return
    }
    if (type === 'del') {
      if (!window.confirm('Are you sure to delete the page?')) return
      try { await operateWikiPage('del', { key }) }
      catch { showNotify('Delete failed', 'err') }
      return
    }
    if (type === 'merge') {
      const v = window.prompt('enter new song id', '')
      if (v) {
        try { await operateWikiPage('merge', { key, new_song: Number(v) }); showNotify('Success', 'succ') }
        catch { showNotify('Transfer failed', 'err') }
      }
      return
    }
    try { await operateWikiPage(type, { key }); showNotify('Success', 'succ') }
    catch { showNotify('Operation failed', 'err') }
  }

  const onJudge = (v: number): void => { setJudge(v) }
  const onPlatform = (v: number): void => { setPlatform(v) }

  const chart = data.chart
  const song = data.song
  const cover = String(song.cover_url ?? song.cover ?? chart.cover ?? '') || staticUrl('img/cover.png')
  const songTitle = String(song.title ?? chart.title ?? '')
  const songArtist = String(song.artist ?? chart.artist ?? '')
  const chartId = chart.id ?? id
  const chartType = num(chart.type, 0)
  const author: Record<string, any> = chart.author ?? {}
  const publisher: Record<string, any> = chart.publisher ?? {}
  const finalHtml = langHtml !== null ? langHtml : wikiHtml
  const gWikiInner = finalHtml || '<div class="g_wiki_new btn" data-type="edit">Add description to the chart</div>'

  return (
    <Shell
      variant="wide"
      title={songTitle}
      css={['wiki.css', 'tmpl.css']}
      chead={song.cover ? <div className="cover" style={{ backgroundImage: `url(${cover})` }}></div> : undefined}
    >
      <div className="song_title g_rblock">
        <div className="coverb">
          <div className="cover" style={{ backgroundImage: `url(${cover})` }}></div>
        </div>

        <div className="tail">
          <a href={URLS.song(data.sid)}>Back to song</a>
        </div>

        <div className="right">
          {data.songEx.hasOrg && (
            <h3 className="textfix" style={{ left: 296 }}><span className="textfix artist">{songArtist}</span> - {songTitle}</h3>
          )}
          <h2 className="textfix title">
            {chartType === 2 ? <em className="t2">Stable</em> : chartType === 1 ? <em className="t1">Beta</em> : <em className="t0">Alpha</em>}
            {num(chart.pubmark, 0) === 1 && <em className="w" title="Need further modification">Warn</em>}
            {chart.hide === true && <em className="h">Hide</em>}
            {num(chart.promote, 0) > 0 && <em className="p" title="Promotion">PM</em>}
            {num(chart.mcver, 0) === 1 && <em className="t2">Free</em>}
            <span className="textfix artist">{data.songEx.artist}</span> - {data.songEx.title}
          </h2>
          <h2 className="mode">
            <img src={staticUrl(`img/mode/mode-${chart.mode ?? 0}.png`)} alt="" />
            <span>{chart.display_version ?? chart.version ?? ''}</span>
            <span style={{ marginLeft: 24 }}>Created by: </span>
            <span className="avatar"><img src={avatarUidUrl(Number(author.id ?? author.uid ?? chart.uid ?? 0))} alt="" /></span>
            <a href={URLS.user(author.id ?? author.uid ?? chart.uid ?? 0)}>{author.username ?? chart.creator ?? ''}</a>
            {chartType === 2 && publisher && (publisher.id || publisher.username) && (
              <>
                <span style={{ marginLeft: 8 }}>Stabled by: </span>
                <span className="avatar"><img src={avatarUidUrl(Number(publisher.id ?? publisher.uid ?? 0))} alt="" /></span>
                <a href={URLS.user(publisher.id ?? publisher.uid ?? 0)}>{publisher.username ?? ''}</a>
              </>
            )}
          </h2>
          <h2 className="sub">
            <label>ID</label>:c<span>{chartId}</span>&nbsp;&nbsp;
            <label>Length</label>:<span>{song.length ?? chart.length ?? ''}s</span>&nbsp;&nbsp;
            <label>BPM</label>:<span>{floatFormat(song.bpm)}</span>
            <label>Last updated</label>:<span className="textfix">{chart.lastedit_str ?? ''}</span>
          </h2>
          <h2 className="tags">
            {data.tags.length > 0 && (
              <>
                <span>Tags:</span>
                {data.tags.map((t, i) => (
                  <a key={`${t.id ?? 't'}-${i}`} href={`${URLS.chart}?tag=${t.id ?? 0}`}>{t.name ?? ''}</a>
                ))}
              </>
            )}
          </h2>
        </div>

        <div className="tool">
          {data.canMark && <a href="#" className="btn g_toolbtn w" data-type="pubmark" title="Need modification" onClick={(e) => { e.preventDefault(); void onTool('pubmark') }}><i></i></a>}
          {data.canTop && (
            num(chart.pubmark, 0) === 2
              ? <a href="#" className="btn g_toolbtn us" data-type="top" title="Cancel top" onClick={(e) => { e.preventDefault(); void onTool('top') }}><i></i></a>
              : <a href="#" className="btn g_toolbtn s" data-type="top" title="Stick to top" onClick={(e) => { e.preventDefault(); void onTool('top') }}><i></i></a>
          )}
          <a href="#" className="btn g_toolbtn e" data-type="edit_meta" title="Edit meta" onClick={(e) => { e.preventDefault(); void onTool('edit_meta') }}><i></i></a>
          <a href={`${URLS.change}?key=${key}`} className="g_toolbtn log" title="Change History"><i></i></a>
          {data.canDel && <a href="#" className="btn g_toolbtn d" data-type="del" title="Delete" onClick={(e) => { e.preventDefault(); void onTool('del') }}><i></i></a>}
          {data.canMerge && <a href="#" className="btn g_toolbtn m" data-type="merge" title="Merge to another song" onClick={(e) => { e.preventDefault(); void onTool('merge') }}><i></i></a>}
        </div>
      </div>

      <div className="g_cont2 g_rblock like_area">
        <div className="num">
          <img src={staticUrl('img/icon-love.png')} alt="" />
          <span>{percentLabel(data.percent)}</span>
        </div>
        <div className="num" style={{ float: 'right' }}>
          <img src={staticUrl('img/icon-donate.png')} alt="" />Donation<span className="l">{data.gold}</span>
        </div>
        <div className="num" style={{ float: 'right' }}>
          <img src={staticUrl('img/icon-play.png')} alt="" /><span>Hot</span><span className="l">{chart.playcount ?? 0}</span>
        </div>
      </div>

      {data.stat && (
        <div className="g_cont2 first_area">
          <JustifyRow>
            <FirstBlock user={data.stat.first3} time={String(data.stat.time3_str ?? '')} pic="rank-3.png" />
            <FirstBlock user={data.stat.first5} time={String(data.stat.time5_str ?? '')} pic="rank-5.png" />
            <FirstBlock user={data.stat.first4} time={String(data.stat.time4_str ?? '')} pic="rank-4.png" />
            <span className="justfix"></span>
          </JustifyRow>
        </div>
      )}

      <div className="g_cont2 g_rblock">
        <h1 className="sec">Ranking</h1>
        <div className="g_actbar" id="score_actbar">
          <a href="#" className="g_btn btn" data-type="delall" onClick={(e) => { e.preventDefault(); void onTool('delall') }}>Clear All Records</a>
          <a href="#" className="g_btn btn" data-type="delmy" onClick={(e) => { e.preventDefault(); void onTool('delmy') }}>Remove score</a>
          <select id="g_judge" className="g_options" value={judge} onChange={(e) => onJudge(Number(e.target.value))}>
            <option value="-1">All</option>
            <option value="0">A(Easy)</option>
            <option value="1">B(Easy+)</option>
            <option value="2">C(Normal)</option>
            <option value="3">D(Normal+)</option>
            <option value="4">E(Hard)</option>
          </select>
          <select className="g_options" id="g_platform" style={{ marginRight: 10 }} value={platform} onChange={(e) => onPlatform(Number(e.target.value))}>
            <option value="0">Pro Judge</option>
            <option value="1">Standard</option>
          </select>
        </div>
        <div className="score_area">
          <ScoreList rows={scores} />
        </div>
      </div>

      {data.donate.length > 0 && (
        <div className="g_cont2 g_rblock">
          <h1 className="sec">Supporters</h1>
          <div className="donate_area g_tmpl_grouplist">
            <JustifyRow>
              {data.donate.map((d, i) => {
                const uid = d.uid ?? d.user?.id ?? 0
                const name = d.username ?? d.user?.username ?? ''
                return (
                  <div className="g_tmpl_user" key={`${uid}-${i}`}>
                    <span className="avatar"><img src={avatarUidUrl(Number(uid))} alt="" /></span>
                    <a className="textfix" href={URLS.user(uid)}>{name}</a>
                    <span className="msg">Support:{d.gold ?? 0} gold</span>
                  </div>
                )
              })}
              <span className="justfix"></span>
            </JustifyRow>
          </div>
        </div>
      )}

      <div className="g_cont2 g_rblock">
        <div className="tool">
          <LangTabs value={lang} onChange={(c, l) => { void onChangeLang(c, l) }} />
          {data.canEdit && <a href="#" className="btn g_toolbtn e" data-type="edit" title="Edit" onClick={(e) => { e.preventDefault(); onEdit() }}><i></i></a>}
        </div>
        <div
          className="g_wiki"
          ref={bodyRef}
          onClick={(e) => { if ((e.target as HTMLElement).closest('.g_wiki_new')) onEdit() }}
        >
          <div dangerouslySetInnerHTML={{ __html: gWikiInner }} />
          <span className="clear"></span>
        </div>
        {loading && <LoadingBlock />}
      </div>

      <TalkWidget talkKey={key} hasOwner={true} />
    </Shell>
  )
}
