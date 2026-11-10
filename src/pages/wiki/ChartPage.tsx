import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { ModIcons } from '../../components/ModIcons'
import { useSession } from '../../components/SessionProvider'
import { SkeletonHead, SkeletonRows } from '../../components/Skeleton'
import { useLoad, asArray, num, formatTime, showNotify, LoadingBlock, JustifyRow, floatFormat } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchChartInfo, fetchRankingList, fetchRankingFirst5, fetchChartDonateList, fetchWiki } from '../../network/api'
import { fetchChartPage, operateWikiPage, operateScore } from '../../network/legacy'
import { bindHiddenToggles } from '../../utils/wiki'
import { avatarUidUrl, coverUrl } from '../../utils/formatters'
import { useWikiHtml, useWikiLang } from '../../utils/wikiRender'
import { LangTabs, TalkWidget } from './WikiPage'
import { t as i18nT } from '../../i18n'

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
  /** Clear All Records：老站 perms.score.delete_scoremodelkey / Go webHIsAdmin */
  isAdmin: boolean
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
  // 老站 {% if stat %} 恒渲染 first_area，加载中也保留三张 Empty 卡片，避免布局跳动
  stat: {},
  wikiRaw: '',
  canMark: false,
  canTop: false,
  canDel: false,
  canMerge: false,
  canEdit: false,
  isAdmin: false,
  sid: 0,
}

const percentLabel = (v: number): string => {
  if (v < 0) return 'N/A'
  if (v >= 99) return i18nT('Masterpiece')
  if (v >= 90) return i18nT('Very Positive')
  if (v >= 80) return i18nT('Positive')
  if (v >= 60) return i18nT('Mostly Positive')
  if (v >= 40) return i18nT('Mixed')
  if (v >= 30) return i18nT('Mostly Negative')
  if (v >= 20) return i18nT('Negative')
  return i18nT('Very Negative')
}

/** 老站 RunningDataChart.time3_str：time==0 → "Never"，否则本地时区 %Y-%m-%d %H:%M */
const firstTimeStr = (ts?: number): string => {
  const n = num(ts, 0)
  if (n <= 0) return 'Never'
  const d = new Date(n < 1e12 ? n * 1000 : n)
  if (Number.isNaN(d.getTime())) return 'Never'
  const p = (v: number) => (v < 10 ? `0${v}` : String(v))
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** /ranking/first5 → 老站 stat（first3/4/5 + time*_str），与 Go /community/chart/page 的 stat 同构 */
const first5ToStat = (r: unknown): Record<string, any> => {
  const f: any = r ?? {}
  const toUser = (u: any): Record<string, any> | null =>
    u && num(u.uid, 0) > 0 ? { id: num(u.uid, 0), username: u.username ?? '' } : null
  return {
    first3: toUser(f.first3), time3_str: firstTimeStr(f.first3?.time),
    first4: toUser(f.first4), time4_str: firstTimeStr(f.first4?.time),
    first5: toUser(f.first5), time5_str: firstTimeStr(f.first5?.time),
  }
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
        <span className="rank">{i18nT('Rank')}</span>
        <span className="name">{i18nT('Player')}</span>
        <span className="score">{i18nT('Score')}</span>
        <span className="combo">{i18nT('Combo')}</span>
        <span className="acc">{i18nT('Acc.')}</span>
        <span className="mod">{i18nT('Mod')}</span>
        <span className="time">{i18nT('Achieved')}</span>
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
              <span className="mod"><ModIcons value={row.mod} none /></span>
              <span className="time textfix">{row.time_str ?? formatTime(row.time)}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default function ChartPage() {
  const { isLogin } = useSession()
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
      const [pageR, infoR, donateR, wikiR, first5R] = await Promise.all([
        fetchChartPage(String(id)).catch(() => ({})),
        fetchChartInfo({ cid }).catch(() => ({})),
        fetchChartDonateList({ cid }).catch(() => ({})),
        fetchWiki({ cid, lang: 0 }).catch(() => ({})),
        // 老站 wiki_page_chart.html:143-148 的「首个达成者」：Go /community/chart/page
        // 已补 stat，旧后端（stat: nil）或 page 接口失败时用这份 /ranking/first5 兜底。
        fetchRankingFirst5({ cid }).catch(() => ({})),
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
        // 老站 {% if stat %} 恒渲染 first_area；优先用 page 接口的完整 stat，
        // 字段缺失（旧后端 stat: nil / 半截对象）时退回 /ranking/first5。
        stat: (p.stat && typeof p.stat === 'object' && 'time3_str' in p.stat
          ? p.stat
          : first5ToStat(first5R)) as Record<string, any>,
        wikiRaw: String((wikiR as any)?.wiki ?? p.content ?? ''),
        // 老站 JSON 只在有权限时写 canXxx 字段，缺省即 False。
        // 这里必须显式 === true：接口失败被 .catch(() => ({})) 吞掉时不能把管理按钮全露出。
        canMark: p.canMark === true,
        canTop: p.canTop === true,
        canDel: p.canDel === true,
        canMerge: p.canMerge === true,
        canEdit: p.canEdit === true,
        isAdmin: p.isAdmin === true,
        sid: chart.sid ?? song.id ?? 0,
      }
    },
    [id],
    EMPTY_CHART,
  )

  const { data: scores, loading: scoresLoading, reload: reloadScores } = useLoad<ScoreRow[]>(
    async () => {
      // 老站 score/views.py:31 from_to_platform：0=Pro Judge(platform 0,1)、1=Standard(2,3,4)；
      // Go /ranking/list 的 pro 是「是否 Pro Judge」布尔（1=platform<2），故需反转。
      // judge 是判定等级过滤（老站 filter(judge=judge)），不是 order 排序位掩码。
      const resp: any = await fetchRankingList({
        cid: Number(id) || 0,
        pro: platform === 0 ? 1 : 0,
        judge,
        // 网页层没有排序选项，必须恒定按 score 排。Go 的 order 是排序位掩码
        // (Combo=1/Acc=2/NoMod=4/NoSpeed=8)，一旦被传成 judge 的值就会切成
        // acc/combo 排序，导致「总分」列看起来乱序。显式锁 0 = score DESC。
        order: 0,
      })
      const rows = asArray<ScoreRow>(resp?.data ?? resp?.items ?? resp)
      // 老站 score/views.py:49-50 filter(judge=judge)。后端正常时已按 judge 过滤，
      // 这里幂等再筛一次：旧版 Go 忽略 judge 参数、或缓存键未带 judge 维度时
      // 会返回同一批数据，前端兜底保证 #g_judge 筛选器一定生效。
      const filtered = judge < 0
        ? rows
        : rows.filter((row) => num(row.judge, -1) === judge)
      // 老站 score/views.py:51 order_by("-score", "-combo", "-time")。
      // 前端再做一次按 score 的稳定降序，兜住服务端缓存 / 旧版本返回的非 score 顺序。
      return filtered
        .map((row, i) => ({ row, i }))
        .sort((a, b) => num(b.row.score, 0) - num(a.row.score, 0) || a.i - b.i)
        .map((x) => x.row)
    },
    [id, judge, platform],
    [] as ScoreRow[],
  )

  const wikiHtml = useWikiHtml(data.wikiRaw)
  const { lang, langHtml, changeLang } = useWikiLang(key)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => bindHiddenToggles(bodyRef.current), [wikiHtml, langHtml])

  const onEdit = (): void => {
    window.location.href = `/wiki/edit?key=${encodeURIComponent(key)}&lang=${lang}&from=${encodeURIComponent(window.location.pathname + window.location.search)}`
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
      try {
        await operateWikiPage('del', { key })
        // 老站 module/wiki/src/init.js:del：有 sid 时跳回所属歌曲页，否则回首页。
        const sid = Number(data.sid) || 0
        window.location.href = sid > 0 ? URLS.song(sid) : URLS.index
      } catch (e) {
        showNotify(e instanceof Error && e.message ? e.message : 'Delete failed', 'err')
      }
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
    catch { showNotify(i18nT('Operation failed'), 'err') }
  }

  const onJudge = (v: number): void => { setJudge(v) }
  const onPlatform = (v: number): void => { setPlatform(v) }

  const chart = data.chart
  const song = data.song
  const rawCover = String(song.cover_url ?? song.cover ?? chart.cover ?? '')
  const cover = rawCover ? coverUrl(rawCover) : staticUrl('img/cover.png')
  const songTitle = String(song.title ?? chart.title ?? '')
  const songArtist = String(song.artist ?? chart.artist ?? '')
  const chartId = chart.id ?? id
  const chartType = num(chart.type, 0)
  const author: Record<string, any> = chart.author ?? {}
  const publisher: Record<string, any> = chart.publisher ?? {}
  const finalHtml = langHtml !== null ? langHtml : wikiHtml
  // 加载中正文也是空串，此时只显示下方骨架，不能当成「还没有简介」
  const gWikiInner = finalHtml || (loading ? '' : '<div class="g_wiki_new btn" data-type="edit">Add description to the chart</div>')

  return (
    <Shell
      variant="wide"
      title={songTitle}
      css={['wiki.css', 'tmpl.css']}
      chead={song.cover ? <div className="cover" style={{ backgroundImage: `url(${cover})` }}></div> : undefined}
    >
      <div className="song_title g_rblock">
        <div className="coverb">
          {/* 加载中 cover 为空会回落到 cover.png（No Cover 图），先用骨架占位 */}
          {loading
            ? <div className="cover wb-skel"></div>
            : <div className="cover" style={{ backgroundImage: `url(${cover})` }}></div>}
        </div>

        <div className="tail">
          <a href={URLS.song(data.sid)}>{i18nT('Back to song')}</a>
        </div>

        {loading ? <SkeletonHead /> : (
          <div className="right">
            {data.songEx.hasOrg && (
              <h3 className="textfix" style={{ left: 296 }}><span className="textfix artist">{songArtist}</span> - {songTitle}</h3>
            )}
            <h2 className="textfix title">
              {chartType === 2 ? <em className="t2">Stable</em> : chartType === 1 ? <em className="t1">Beta</em> : <em className="t0">Alpha</em>}
              {num(chart.pubmark, 0) === 1 && <em className="w" title={i18nT('Need further modification')}>Warn</em>}
              {chart.hide === true && <em className="h">Hide</em>}
              {num(chart.promote, 0) > 0 && <em className="p" title={i18nT('Promotion')}>PM</em>}
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
              <label>{i18nT('Length')}</label>:<span>{song.length ?? chart.length ?? ''}s</span>&nbsp;&nbsp;
              <label>{i18nT('BPM')}</label>:<span>{floatFormat(song.bpm)}</span>
              <label>{i18nT('Last updated')}</label>:<span className="textfix">{chart.lastedit_str ?? ''}</span>
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
        )}

        <div className="tool">
          {data.canMark && <a href="#" className="btn g_toolbtn w" data-type="pubmark" title="Need modification" onClick={(e) => { e.preventDefault(); void onTool('pubmark') }}><i></i></a>}
          {data.canTop && (
            num(chart.pubmark, 0) === 2
              ? <a href="#" className="btn g_toolbtn us" data-type="top" title="Cancel top" onClick={(e) => { e.preventDefault(); void onTool('top') }}><i></i></a>
              : <a href="#" className="btn g_toolbtn s" data-type="top" title="Stick to top" onClick={(e) => { e.preventDefault(); void onTool('top') }}><i></i></a>
          )}
          <a href="#" className="btn g_toolbtn e" data-type="edit_meta" title="Edit meta" onClick={(e) => { e.preventDefault(); void onTool('edit_meta') }}><i></i></a>
          <a href={`${URLS.change}?key=${key}`} className="g_toolbtn log" title="Change History"><i></i></a>
          {data.canDel && <a href="#" className="btn g_toolbtn d" data-type="del" title={i18nT('Delete')} onClick={(e) => { e.preventDefault(); void onTool('del') }}><i></i></a>}
          {data.canMerge && <a href="#" className="btn g_toolbtn m" data-type="merge" title="Merge to another song" onClick={(e) => { e.preventDefault(); void onTool('merge') }}><i></i></a>}
        </div>
      </div>

      {/* 加载中只留图标和标签，数值先空着：否则会先闪出 N/A、0 再变成真实值 */}
      <div className="g_cont2 g_rblock like_area">
        <div className="num">
          <img src={staticUrl('img/icon-love.png')} alt="" />
          <span>{loading ? '' : percentLabel(data.percent)}</span>
        </div>
        <div className="num" style={{ float: 'right' }}>
          <img src={staticUrl('img/icon-donate.png')} alt="" />{i18nT('Donation')}<span className="l">{loading ? '' : data.gold}</span>
        </div>
        <div className="num" style={{ float: 'right' }}>
          <img src={staticUrl('img/icon-play.png')} alt="" /><span>{i18nT('Hot')}</span><span className="l">{loading ? '' : chart.playcount ?? 0}</span>
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
        <h1 className="sec">{i18nT('Ranking')}</h1>
        <div className="g_actbar" id="score_actbar">
          {/* 老站 {% if perms.score.delete_scoremodelkey %} / {% if user.is_authenticated %}；
              后端 OperateScore 分别要求 webHIsAdmin 与 uid != 0，缺省一律收起 */}
          {data.isAdmin && <a href="#" className="g_btn btn" data-type="delall" onClick={(e) => { e.preventDefault(); void onTool('delall') }}>{i18nT('Clear All Records')}</a>}
          {isLogin && <a href="#" className="g_btn btn" data-type="delmy" onClick={(e) => { e.preventDefault(); void onTool('delmy') }}>{i18nT('Remove score')}</a>}
          <select id="g_judge" className="g_options" value={judge} onChange={(e) => onJudge(Number(e.target.value))}>
            <option value="-1">{i18nT('All')}</option>
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
          {/* 只在首次加载（还没有任何行）时用骨架；切换筛选时保留旧列表直到新数据到达，避免闪烁 */}
          {scoresLoading && scores.length === 0 ? <SkeletonRows /> : <ScoreList rows={scores} />}
        </div>
      </div>

      {data.donate.length > 0 && (
        <div className="g_cont2 g_rblock">
          <h1 className="sec">{i18nT('Supporters')}</h1>
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
          <LangTabs value={lang} onChange={(c) => { void changeLang(c) }} />
          {data.canEdit && <a href="#" className="btn g_toolbtn e" data-type="edit" title={i18nT('Edit')} onClick={(e) => { e.preventDefault(); onEdit() }}><i></i></a>}
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
