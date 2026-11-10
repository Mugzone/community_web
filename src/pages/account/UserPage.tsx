import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { SkeletonHead, SkeletonRows } from '../../components/Skeleton'
import { ModIcons } from '../../components/ModIcons'
import { asArray, formatTime, JustifyRow, num, useLoad, floatFormat, showNotify } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import {
  fetchPlayerInfo,
  fetchPlayerAllRank,
  fetchPlayerActivity,
  fetchPlayerCharts,
  fetchPlayerRecentScores,
  postForm,
} from '../../network/api'
import { fetchAchieveList, fetchUserPageWiki } from '../../network/legacy'
import { avatarUrl, coverUrl } from '../../utils/formatters'
import { isRedName, regionMap } from '../../utils/profile'
import { t as i18nT } from '../../i18n'
import { useWikiHtml } from '../../utils/wikiRender'
import { bindHiddenToggles } from '../../utils/wiki'

/* profile/index.html：extended base_width.html（wide），交互对应 module/user/src/init.js */
type Rec = Record<string, any>
type UserData = {
  info: Rec
  ranks: Rec[]
  acts: Rec[]
  recent: Rec[]
  charts: Rec[]
  achieves: Rec[]
  content: string
  friendType: number
  tab: number
  /** /player/info 的 group 是 group_id 数字数组；兼容老站 {id,name} 对象形式 */
  group: (number | Rec)[]
  /** group_list: 后端从 auth_group 读出的 [{id,name}]，优先用于显示组名 */
  groupList: (number | Rec)[]
  unread: number
  canBan: boolean
  canActive: boolean
  canEdit: boolean
  redName: boolean
  banner: string
}

const FALLBACK: UserData = {
  info: {}, ranks: [], acts: [], recent: [], charts: [], achieves: [], content: '',
  friendType: 0, tab: 0, group: [], groupList: [], unread: 0,
  canBan: false, canActive: false, canEdit: false, redName: false, banner: '',
}

/** 老站 account/views.py:305-313 成就最多 5 个，并补齐到 3 的倍数让 text-align:justify 生效 */
const achHolds = (count: number): number => {
  const n = 3 - (count % 3)
  return n > 0 && n !== 3 ? n : 0
}

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))
const n = (v: unknown, fb = 0): number => num(v, fb)
const fmt2 = (v: unknown): string => floatFormat(v, 2)
const ymd = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return ''
  const raw = String(v)
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(raw)) return raw
  const t = Number(raw)
  if (!Number.isFinite(t)) return raw
  const d = new Date(t < 1e12 ? t * 1000 : t)
  return Number.isNaN(d.getTime()) ? raw : `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
const genderLabel = (g: unknown): string => {
  const map: Record<number, string> = { 1: i18nT('Boy'), 2: i18nT('Girl'), 3: i18nT('男の娘') }
  return map[n(g)] ?? ''
}
const countryLabel = (c: unknown): string => regionMap[n(c)]?.fallback ?? '???'

/* 老站 account/models.py:178-208 的 playtime_str / playedtime_str：
 * 秒数 → "Never" / "H:MM:SS" / "D days HH:MM"。接口只给数值，格式化在前端做。 */
const durationStr = (value: unknown): string => {
  const total = n(value, 0)
  if (total <= 0) return i18nT('Never')
  const sec = total % 60
  const min = Math.floor(total / 60) % 60
  const hour = Math.floor(total / 3600) % 24
  const days = Math.floor(total / 86400)
  const pad = (v: number) => String(v).padStart(2, '0')
  return days === 0 ? `${hour}:${pad(min)}:${pad(sec)}` : `${days} days ${pad(hour)}:${pad(min)}`
}

/* 老站 account/models.py:146-166 的 age：按生日算周岁，无生日显示 ???。
 * /player/info 只返回 birth（UTC 时间戳），不再返回 age。 */
const ageFromBirth = (value: unknown): string => {
  const ts = n(value, 0)
  if (ts <= 0) return '???'
  const birth = new Date(ts < 1e12 ? ts * 1000 : ts)
  if (Number.isNaN(birth.getTime())) return '???'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return age >= 0 && age < 150 ? String(age) : '???'
}

/* 老站 group 是 Django Group 对象（有 id/name），Go /player/info 返回 group_id 数字数组。
 * 名称按 MaApi-old MalodyEnum.UserGroup 与 lib/util.py 的组定义映射。 */
const GROUP_NAMES: Record<number, string> = {
  2: 'Admin', 3: 'Publisher', 4: 'Died', 5: 'Editor',
  6: 'Artist', 7: 'Architect', 8: 'Assistant', 9: 'Organizer', 10: 'Hide',
}
const groupLabel = (g: number | Rec): string => {
  if (typeof g === 'object' && g !== null) return s(g.name)
  const id = n(g, 0)
  return GROUP_NAMES[id] ?? (id > 1 ? `Group ${id}` : '')
}
const groupVisible = (g: number | Rec): boolean =>
  (typeof g === 'object' && g !== null ? n(g.id) : n(g)) > 1

/* 老站 account/models.py:172-176 banner_url = "http://cni.machart.top" + banner；
 * Go 只返回相对路径 /banner/xx.jpg!banner，用协议相对地址避免混合内容。 */
const BANNER_CDN = '//cni.machart.top'
const bannerUrl = (v: unknown): string => {
  const raw = s(v)
  if (!raw) return ''
  if (/^https?:\/\//.test(raw) || raw.startsWith('//')) return raw
  return BANNER_CDN + (raw.startsWith('/') ? '' : '/') + raw
}
const bgCover = (v: unknown): string => {
  const raw = s(v)
  if (!raw) return staticUrl('img/cover.png')
  return coverUrl(raw)
}

/* /api/account/achieve/list 的 data 可能是数组，也可能是 {list, achievements, ...} 对象 */
const achList = (res: unknown): Rec[] => {
  const d = (res as Rec | undefined)?.data
  if (Array.isArray(d)) return d as Rec[]
  const obj = (d ?? res ?? {}) as Rec
  return asArray<Rec>(obj.list ?? obj.achievements)
}

export default function UserPage() {
  const { pathname } = useLocation()
  const { session, isLogin } = useSession()
  const m = pathname.match(/\/accounts\/user\/(\d+)/)
  const uid = m ? Number(m[1]) : (session?.uid ?? 0)
  const myUid = session?.uid ?? 0
  const isMe = isLogin && myUid === uid
  const isOther = isLogin && myUid !== uid

  const { data, loading, reload } = useLoad<UserData>(
    async () => {
      const [infoRes, rankRes, actRes, chartRes, achRes, upRes, recentRes] = await Promise.all([
        fetchPlayerInfo({ uid }).catch(() => undefined),
        fetchPlayerAllRank({ uid }).catch(() => undefined),
        fetchPlayerActivity({ uid }).catch(() => undefined),
        fetchPlayerCharts({ uid }).catch(() => undefined),
        fetchAchieveList(uid).catch(() => undefined),
        // 老站 account/views.py:317 取 plugin_wiki(key=user_<uid>).html；
        // Go 的 /community/wiki/userpage 返回的是 raw wiki 文本，需前端渲染
        fetchUserPageWiki(uid).catch(() => undefined),
        // 末尾追加：解构顺序必须与上方 Promise.all 数组一一对应
        fetchPlayerRecentScores({ uid }).catch(() => undefined),
      ])
      // /api/player/info 返回扁平结构（username/gold/... 在顶层）；其它接口带 data 包裹，两者兼容
      const info: Rec = ((infoRes as Rec | undefined)?.data ?? infoRes ?? {}) as Rec
      const up: Rec = ((upRes as Rec | undefined)?.data ?? upRes ?? {}) as Rec
      return {
        info,
        ranks: asArray<Rec>((rankRes as Rec | undefined)?.data ?? rankRes),
        acts: asArray<Rec>((actRes as Rec | undefined)?.data ?? actRes),
        // 老站 recent 是服务端直接查 score_key；/player/activity 里没有这个字段，
        // 改由 /score/player/recent 提供。
        recent: asArray<Rec>((recentRes as Rec | undefined)?.data ?? (recentRes as Rec | undefined)?.list ?? []),
        charts: asArray<Rec>((chartRes as Rec | undefined)?.data ?? chartRes),
        achieves: achList(achRes),
        content: s(up.content ?? up.wiki ?? info.content ?? info.wiki ?? info.userpage),
        friendType: n(info.friend_type ?? info.friendType ?? info.friend, 0),
        tab: n(info.tab, 0),
        group: asArray<number | Rec>(info.group),
        // 后端新增的 [{id,name}]：老站网页拿的就是 Django Group 对象，
        // 有它就不必依赖前端硬编码映射，新组（如 id=11）自动显示真实名称。
        groupList: asArray<number | Rec>(info.group_list ?? info.groups),
        unread: n(info.unread, 0),
        canBan: Boolean(info.canban),
        canActive: Boolean(info.canactive),
        canEdit: Boolean(info.can_edit ?? info.canEdit),
        // 老站红名由 active_type 决定，/player/info 里叫 active（见 utils/profile.ts）
        redName: isRedName(info),
        banner: bannerUrl(info.banner_url ?? info.bannerUrl ?? info.banner),
      }
    },
    [uid],
    FALLBACK,
  )

  // 与 wiki 正文共用渲染管线（markdown 式标记 + {{ name:... }} 模板块）
  const profileHtml = useWikiHtml(data.content)
  // 与 WikiPage / SongPage / ChartPage 一致：#hidden 折叠块靠事件委托切换 open class，
  // 只有 CSS 的话「Click to display」点了不会展开。
  const profileRef = useRef<HTMLDivElement>(null)
  useEffect(() => bindHiddenToggles(profileRef.current), [profileHtml])

  const [tab, setTab] = useState<number>(0)
  const [friendType, setFriendType] = useState<number>(0)
  const [achieves, setAchieves] = useState<Rec[]>([])
  useEffect(() => { setTab(data.tab); setFriendType(data.friendType); setAchieves(data.achieves) }, [data])

  /* module/user init.js：banner 背景整页生效，SPA 需在卸载时还原 */
  useEffect(() => {
    if (!data.banner) return
    const body = document.body
    const center = document.getElementById('center')
    const footer = document.getElementById('footer')
    const prevBg = body.style.backgroundImage
    const prevSize = body.style.backgroundSize
    const prevOpacity = center?.style.opacity ?? ''
    body.style.backgroundImage = `url(${data.banner})`
    body.style.backgroundSize = 'cover'
    if (center) center.style.opacity = '0.9'
    footer?.classList.add('light')
    return () => {
      body.style.backgroundImage = prevBg
      body.style.backgroundSize = prevSize
      if (center) center.style.opacity = prevOpacity
      footer?.classList.remove('light')
    }
  }, [data.banner])

  /* module/user：tab 切换 */
  const switchTab = (type: string, t: number) => {
    setTab(t)
  }

  /* module/user：好友切换
   * 后端是 /player/friend/toggle（不是 /account/friend/toggle），参数 touid，
   * 且为 toggle 语义、没有 add 参数；返回 code 就是切换后的关系：
   * 0=非好友 / 1=单向关注 / 2=互粉。老站加好友失败时必须保持原状态。 */
  const toggleFriend = async () => {
    try {
      const resp = await postForm<Record<string, unknown> | string>('/player/friend/toggle', {
        body: { touid: String(uid) },
      })
      const code = typeof resp === 'object' && resp !== null ? Number(resp.code) : NaN
      if (!Number.isFinite(code) || code < 0 || code > 2) throw new Error('bad response')
      setFriendType(code)
      showNotify(code > 0 ? 'Friend added' : 'Friend removed', 'succ')
    } catch {
      // 失败不乐观更新：提示错误并重新拉取，保证界面与服务端一致
      showNotify(i18nT('Operation failed'), 'err')
      reload()
    }
  }

  /* module/user：ban / active 等操作 */
  const operation = async (type: string) => {
    try {
      await postForm('/account/operation', { body: { uid: String(uid), type } })
    } catch {
      /* ignore */
    }
    reload()
  }

  const info = data.info
  const username = s(info.username ?? info.name)

  return (
    <Shell variant="wide" title={username || 'User'} css={['profile.css', 'user.css']} contCls="gb_profile">
      <div className="user_head g_rblock">
        <div className="coverb">
          {/* 老站 {% avatar to_user 150 "g_round" %}：!avatar 缩略图 + 内联 150px 上限，user.css 没有 img 尺寸规则。
              加载中 avatar 为空会回落到默认头像，先用骨架占位 */}
          {loading ? <div className="g_round wb-skel wb-skel-avatar"></div> : (
            <img
              className="g_round"
              src={avatarUrl(info.avatar, uid, 150)}
              alt={username}
              style={{ maxWidth: 150, maxHeight: 150 }}
            />
          )}
        </div>

        {loading ? <SkeletonHead /> : (
          <div className="right">
            <p className="name">
              {data.redName
                ? <span style={{ color: '#ef6666' }}>{username}</span>
                : <span>{username}</span>}
              {(data.groupList.length > 0 ? data.groupList : data.group)
                .filter(groupVisible)
                .map((g, i) => (
                  <em key={i}>{groupLabel(g)}</em>
                ))}
            </p>

            {/* 老站 profile/index.html:35-56 这些标签都用 {% trans %}，冒号留在译文之后 */}
            <p className="time">
              <span>{i18nT('Joined since')}:&nbsp;{ymd(info.regtime ?? info.date_joined)}</span>
              <span>{i18nT('Last play')}:&nbsp;{(info.lastPlay ?? info.last_play) ? ymd(info.lastPlay ?? info.last_play) : i18nT('Never')}</span>
              <span>{i18nT('Played')}: {s(info.playtime_str ?? info.playTimeStr) || durationStr(info.playTime)}</span>
            </p>
            <p>
              <span>{i18nT('Gender')}:&nbsp;{genderLabel(info.gender)}</span>
              <span>{i18nT('Age')}:&nbsp;{s(info.age) || ageFromBirth(info.birth)}</span>
              <span>{i18nT('Location')}:&nbsp;{countryLabel(info.country ?? info.area)}</span>
            </p>
            <p>
              <span>{i18nT('Gold')}:&nbsp;{n(info.gold)}</span>
              {n(info.gold_d ?? info.goldD) > 0 && (
                <span style={{ marginLeft: '10px' }}>{i18nT('Income')}:&nbsp;{n(info.gold_d ?? info.goldD)}</span>
              )}
              {n(info.playedTime ?? info.playedtime ?? info.played_time) > 0 && (
                <span style={{ marginLeft: '10px' }}>
                  {i18nT('Charts been played')}:&nbsp;{s(info.playedtime_str) || durationStr(info.playedTime ?? info.playedtime ?? info.played_time)}
                </span>
              )}
            </p>
            <p>
              <span>{i18nT('Stable charts')}:&nbsp;{n(info.count_2 ?? info.stableCount ?? info.stableCharts)}</span>
              <span>{i18nT('Unstable charts')}:&nbsp;{n(info.count_1 ?? info.unstableCount ?? info.unstableCharts)}</span>
              {n(info.count_0 ?? info.slot) > 0 && <span>{i18nT('Chart slot')}:&nbsp;{n(info.count_0 ?? info.slot)}</span>}
            </p>
          </div>
        )}

        <div className="tool">
          {data.canBan && (
            <a href="#" className="btn g_toolbtn l" title={i18nT('Ban')} data-type="ban" onClick={(e) => { e.preventDefault(); void operation('ban') }}><i></i></a>
          )}
          {data.canActive && (
            <a href="#" className="btn g_toolbtn ul" title="Active" data-type="active" onClick={(e) => { e.preventDefault(); void operation('active') }}><i></i></a>
          )}
          {isOther && (
            <a href={`/talk/user/${uid}/${myUid}`} className="g_toolbtn ml" title={i18nT('Messages')}><i></i></a>
          )}
          {isMe && (
            <>
              <a href={URLS.notify} className="g_toolbtn w" title={i18nT('View notification')}>
                <i></i>{data.unread > 0 && <em></em>}
              </a>
              <a href={URLS.talkUser} className="g_toolbtn ml" title={i18nT('Messages')}><i></i></a>
            </>
          )}
          {isOther && (
            friendType > 0 ? (
              <a href="#" id="J_friend" className="btn g_toolbtn ulk2" data-type="unf"
                title={friendType === 2 ? 'Revoke mutual friend' : 'Revoke friend'}
                onClick={(e) => { e.preventDefault(); void toggleFriend() }}><i></i></a>
            ) : (
              <a href="#" id="J_friend" className="btn g_toolbtn lk" data-type="addf" title="Add friend"
                onClick={(e) => { e.preventDefault(); void toggleFriend() }}><i></i></a>
            )
          )}
          {isMe && (
            <>
              <a href={URLS.invite} className="g_toolbtn in" title="Invite Code"><i></i></a>
              <a href={URLS.friend} className="g_toolbtn f" title={i18nT('My Friends')}><i></i></a>
            </>
          )}
          {isOther && data.canEdit && (
            <a href={`/upload/avatar?uid=${uid}`} title={i18nT('Edit')} className="g_toolbtn e"><i></i></a>
          )}
          {isMe && (
            <a href={URLS.configProfile} title={i18nT('Edit')} className="g_toolbtn e"><i></i></a>
          )}
        </div>
      </div>

      <div className="body">
        <div className="panel">
          <div className="rank g_rblock">
            {loading ? <SkeletonRows count={3} /> : data.ranks.length > 0 ? data.ranks.map((item: Rec, i: number) => (
              <div className="item" key={i}>
                <img src={staticUrl(`img/mode/mode-${n(item.mode)}.png`)} alt="mode" />
                <div className="right">
                  <p className="rank">#{s(item.exp_rank ?? item.rank ?? item.gradeRank)}</p>
                  {/* /ranking/player/all 返回 pc（游玩次数）与 exp；老站模板字段名是
                      playcount / exp，两者都兼容。JSX 会吞掉标签间换行，必须显式补空格，
                      否则两列会粘成 Exp.123Playcount:456、Acc.97.96%Combo:3544。 */}
                  <p>
                    <span>Exp.{s(item.exp ?? item.value ?? 0)}</span>
                    {' '}
                    <span>{i18nT('Playcount')}:{s(item.playcount ?? item.pc ?? 0)}</span>
                  </p>
                  <p>
                    <span>Acc.{fmt2(item.acc)}%</span>
                    {' '}
                    <span>Combo:{s(item.combo)}</span>
                  </p>
                </div>
              </div>
            )) : i18nT('No score record')}
          </div>

          {achieves.length > 0 && (
            <div className="ach g_rblock">
              <a href={`/accounts/user/achieve/${uid}`}>
                <JustifyRow>
                  {achieves.slice(0, 5).map((item: Rec, i: number) => (
                    <img key={i} src={s(item.cover ?? item.achieve?.cover)} alt="achieve" />
                  ))}
                  {Array.from({ length: achHolds(Math.min(achieves.length, 5)) }, (_, i) => (
                    <img className="justfyHold" key={`h${i}`} alt="" />
                  ))}
                </JustifyRow>
              </a>
              <span className="justfix"></span>
            </div>
          )}
        </div>

        <div className="record">
          <div className="option g_rblock">
            <a href="#" className={`btn ${tab === 0 ? 'curr' : ''}`} data-type="active" onClick={(e) => { e.preventDefault(); switchTab('Recent activities', 0) }}>{i18nT('Recent activities')}</a>
            <a href="#" className={`btn ${tab === 1 ? 'curr' : ''}`} data-type="recent" onClick={(e) => { e.preventDefault(); switchTab('Recent high scores', 1) }}>{i18nT('Recent high scores')}</a>
            {data.charts.length > 0 && (
              <a href="#" className={`btn ${tab === 2 ? 'curr' : ''}`} data-type="chart" onClick={(e) => { e.preventDefault(); switchTab('Chart', 2) }}>{i18nT('Chart')}</a>
            )}
            <a href="#" className={`btn ${tab === 3 ? 'curr' : ''}`} data-type="wiki" onClick={(e) => { e.preventDefault(); switchTab('Profile', 3) }}>{i18nT('Profile')}</a>
          </div>

          {/* 各 tab 的列表在加载中都是空的，统一用一块骨架占位 */}
          {loading && <div className="g_rblock wb-skel-block"><SkeletonRows /></div>}

          <div className={`wiki g_rblock ${tab === 3 ? 'curr' : ''}`}>
            {(isMe || data.canEdit) && (
              <div className="tool">
                <a href={URLS.userpageEdit(uid)} className="g_toolbtn e"><i></i></a>
              </div>
            )}
            {profileHtml && (
              <div className="g_wiki userpage" ref={profileRef} dangerouslySetInnerHTML={{ __html: `${profileHtml}<span class="clear"></span>` }}></div>
            )}
          </div>

          <div className={`recent ${tab === 1 ? 'curr' : ''}`}>
            {data.recent.map((item: Rec, i: number) => {
              const chart: Rec = (item.chart ?? {}) as Rec
              const song: Rec = (chart.song ?? {}) as Rec
              return (
                <div className="item g_rblock" key={i}>
                  <div className="cover" style={{ backgroundImage: `url(${bgCover(song.cover_url ?? song.cover)})` }}></div>
                  <div className="right">
                    <p className="textfix title">
                      <img src={staticUrl(`img/mode/mode-${n(item.mode)}.png`)} alt="mode" />
                      <a href={URLS.chartPage(item.chart_id ?? chart.id)}>{s(song.title)} - {s(chart.display_version ?? chart.version)}</a>
                    </p>
                    <p>Score: {s(item.score)}&nbsp;&nbsp;
                      Combo: {s(item.combo)}&nbsp;&nbsp;
                      Acc. :{fmt2(item.acc)}%&nbsp;&nbsp;
                      Judge :<em className={`color-${n(item.judge)}`}>{s(item.judge_str)}</em>
                    </p>
                    <p>
                      {/* 老站 profile/index.html:182 `format_mods item.mod none=False`：
                          mod 是位掩码，渲染成 g_mod 图标；0 时留空。以前的
                          `s(item.mod_str ?? item.mod)` 会把 32/16 这类掩码直接
                          当成数字显示，后端 mod_str 当时也是同一个数字。 */}
                      <span className="mod"><ModIcons value={item.mod ?? item.mod_str} /></span>
                      <span className="time">{s(item.time_from_now) || formatTime(item.time)}</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={`active ${tab === 0 ? 'curr' : ''}`}>
            {data.acts.map((item: Rec, i: number) => (
              <div className="item g_rblock" key={i}>
                <a className="textfix" href={s(item.link)}>{s(item.msg ?? item.text ?? item.desc)}</a>
                <span>{s(item.time_from_now ?? item.time_str ?? formatTime(item.time))}</span>
              </div>
            ))}
          </div>

          {data.charts.length > 0 && (
            <div className={`chart ${tab === 2 ? 'curr' : ''}`}>
              {data.charts.map((item: Rec, i: number) => {
                const song: Rec = (item.song ?? item) as Rec
                // Go 的 hot 字段带 omitempty，playcount=0 时整个字段不返回；
                // 0 或缺失都不展示 Hot 标签，避免只留一个空的「Hot:」。
                const hot = n(item.hot ?? item.playcount, 0)
                return (
                  <div className="item g_rblock" key={i}>
                    <div className="cover" style={{ backgroundImage: `url(${bgCover(song.cover_url ?? song.cover)})` }}></div>
                    <div className="right">
                      <p className="textfix title">
                        <img src={staticUrl(`img/mode/mode-${n(item.mode)}.png`)} alt="mode" />
                        <a href={URLS.chartPage(item.id ?? item.cid)}>{s(song.title)} - {s(item.display_version ?? item.version)}</a>
                      </p>
                      <p>
                        Length: {s(item.length)}s
                        {hot > 0 && <>&nbsp;&nbsp; Hot: {hot}</>}
                      </p>
                      {/* /community/player/chart 返回 time（unix 秒），没有 lastedit_str */}
                      <p><span className="time">{s(item.lastedit_str ?? item.time_str) || formatTime(item.time ?? item.lastedit)}</span></p>
                    </div>
                  </div>
                )
              })}
              {/* 老站 all_chart(uid) 会把 uid 换成用户名预填 Creator 筛选框；
                  v3 用 keyword=<用户名> 把作者名带到谱面列表页（AllChart 会按作者筛选）。 */}
              <div className="more g_rblock">
                <a href={`${URLS.chart}?keyword=${encodeURIComponent(username || String(uid))}`}>{i18nT('Show All')}</a>
              </div>
            </div>
          )}
        </div>
        <span className="clear"></span>
      </div>
    </Shell>
  )
}
