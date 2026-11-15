import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { SkeletonHead, SkeletonRows } from '../../components/Skeleton'
import { ModIcons } from '../../components/ModIcons'
import { JustifyRow } from '../../components/fragments'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { URLS, staticUrl } from '../../lib/urls'
import {
  fetchPlayerInfo,
  fetchPlayerAllRank,
  fetchPlayerActivity,
  fetchPlayerCharts,
  fetchPlayerRecentScores,
  fetchPlayerLabels,
  postForm,
  type RespPlayerLabelItem,
} from '../../network/api'
import { fetchAchieveList } from '../../network/pageAccount'
import { fetchUserPageWiki } from '../../network/pageWeb'
import { avatarUrl, coverUrl } from '../../utils/formatters'
import { isRedName, regionMap } from '../../utils/profile'
import { t as i18nT } from '../../i18n'
import { useWikiHtml } from '../../utils/wikiRender'
import { bindHiddenToggles } from '../../utils/wiki'
import { asString as s, num as n, asArray, formatTime, floatFormat } from '../../utils/data'
import type { AnyRec as Rec } from '../../utils/data'

type UserData = {
  info: Rec
  ranks: Rec[]
  acts: Rec[]
  recent: Rec[]
  charts: Rec[]
  achieves: Rec[]
  labels: RespPlayerLabelItem[]
  content: string
  friendType: number
  tab: number
  group: (number | Rec)[]
  groupList: (number | Rec)[]
  unread: number
  canBan: boolean
  canActive: boolean
  canEdit: boolean
  redName: boolean
  banner: string
}

const FALLBACK: UserData = {
  info: {}, ranks: [], acts: [], recent: [], charts: [], achieves: [], labels: [], content: '',
  friendType: 0, tab: 0, group: [], groupList: [], unread: 0,
  canBan: false, canActive: false, canEdit: false, redName: false, banner: '',
}

const achHolds = (count: number): number => {
  const n = 3 - (count % 3)
  return n > 0 && n !== 3 ? n : 0
}

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

const BANNER_CDN = '//cni.machart.top'
const PLAYER_LABEL_IMG_BASE = '//cdn1.machart.top/static/img/plabel/'
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
      const [infoRes, rankRes, actRes, chartRes, achRes, upRes, recentRes, labelRes] = await Promise.all([
        fetchPlayerInfo({ uid }).catch(() => undefined),
        fetchPlayerAllRank({ uid }).catch(() => undefined),
        fetchPlayerActivity({ uid }).catch(() => undefined),
        fetchPlayerCharts({ uid }).catch(() => undefined),
        fetchAchieveList(uid).catch(() => undefined),
        fetchUserPageWiki(uid).catch(() => undefined),
        fetchPlayerRecentScores({ uid }).catch(() => undefined),
        fetchPlayerLabels({ uid }).catch(() => undefined),
      ])
      const info: Rec = ((infoRes as Rec | undefined)?.data ?? infoRes ?? {}) as Rec
      const up: Rec = ((upRes as Rec | undefined)?.data ?? upRes ?? {}) as Rec
      return {
        info,
        ranks: asArray<Rec>((rankRes as Rec | undefined)?.data ?? rankRes),
        acts: asArray<Rec>((actRes as Rec | undefined)?.data ?? actRes),
        recent: asArray<Rec>((recentRes as Rec | undefined)?.data ?? (recentRes as Rec | undefined)?.list ?? []),
        charts: asArray<Rec>((chartRes as Rec | undefined)?.data ?? chartRes),
        achieves: achList(achRes),
        labels: asArray<RespPlayerLabelItem>(labelRes),
        content: s(up.content ?? up.wiki ?? info.content ?? info.wiki ?? info.userpage),
        friendType: n(info.friend_type ?? info.friendType ?? info.friend, 0),
        tab: n(info.tab, 0),
        group: asArray<number | Rec>(info.group),
        groupList: asArray<number | Rec>(info.group_list ?? info.groups),
        unread: n(info.unread, 0),
        canBan: Boolean(info.canban),
        canActive: Boolean(info.canactive),
        canEdit: Boolean(info.can_edit ?? info.canEdit),
        redName: isRedName(info),
        banner: bannerUrl(info.banner_url ?? info.bannerUrl ?? info.banner),
      }
    },
    [uid],
    FALLBACK,
  )

  const profileHtml = useWikiHtml(data.content)
  const profileRef = useRef<HTMLDivElement>(null)
  useEffect(() => bindHiddenToggles(profileRef.current), [profileHtml])

  const [tab, setTab] = useState<number>(0)
  const [friendType, setFriendType] = useState<number>(0)
  const [achieves, setAchieves] = useState<Rec[]>([])
  useEffect(() => { setTab(data.tab); setFriendType(data.friendType); setAchieves(data.achieves) }, [data])

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

  const switchTab = (_type: string, t: number) => {
    setTab(t)
  }

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
      showNotify(i18nT('Operation failed'), 'err')
      reload()
    }
  }

  const operation = async (type: string) => {
    try {
      await postForm('/account/operation', { body: { uid: String(uid), type } })
    } catch {
    }
    reload()
  }

  const info = data.info
  const username = s(info.username ?? info.name)

  return (
    <Shell variant="wide" title={username || 'User'} css={['profile.css', 'user.css']} contCls="gb_profile">
      <div className="user_head g_rblock">
        <div className="coverb">
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
            <a href="#" className={`btn ${tab === 4 ? 'curr' : ''}`} data-type="badge" onClick={(e) => { e.preventDefault(); switchTab('Badge', 4) }}>{i18nT('Badge')}</a>
          </div>

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
                      <p><span className="time">{s(item.lastedit_str ?? item.time_str) || formatTime(item.time ?? item.lastedit)}</span></p>
                    </div>
                  </div>
                )
              })}
              <div className="more g_rblock">
                <a href={`${URLS.chart}?keyword=${encodeURIComponent(username || String(uid))}`}>{i18nT('Show All')}</a>
              </div>
            </div>
          )}

          <div className={`badge g_rblock ${tab === 4 ? 'curr' : ''}`}>
            {data.labels.length > 0 ? (
              <div className="badge_list">
                {data.labels.map((label, i) => (
                  <div className="badge_item" key={`${label.item}-${i}`}>
                    <img
                      src={`${PLAYER_LABEL_IMG_BASE}${label.item}`}
                      alt={`badge-${label.item}`}
                      width={258}
                      height={120}
                      loading="lazy"
                    />
                    {n(label.count) > 1 && <span className="badge_count">x{n(label.count)}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="g_memo"><span className="g_round">{i18nT('No badges')}</span></div>
            )}
          </div>
        </div>
        <span className="clear"></span>
      </div>
    </Shell>
  )
}
