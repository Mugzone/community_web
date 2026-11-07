import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { asArray, formatTime, JustifyRow, num, showNotify, useLoad, floatFormat } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import {
  fetchPlayerInfo,
  fetchPlayerAllRank,
  fetchPlayerActivity,
  fetchPlayerCharts,
  postForm,
} from '../../network/api'
import { fetchAchieveList, operateAchieve } from '../../network/legacy'
import { avatarUrl, coverUrl } from '../../utils/formatters'
import { regionMap } from '../../utils/profile'

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
  group: Rec[]
  unread: number
  canBan: boolean
  canActive: boolean
  canEdit: boolean
  redName: boolean
  banner: string
}

const FALLBACK: UserData = {
  info: {}, ranks: [], acts: [], recent: [], charts: [], achieves: [], content: '',
  friendType: 0, tab: 0, group: [], unread: 0,
  canBan: false, canActive: false, canEdit: false, redName: false, banner: '',
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
  const map: Record<number, string> = { 1: 'Boy', 2: 'Girl', 3: '男の娘' }
  return map[n(g)] ?? ''
}
const countryLabel = (c: unknown): string => regionMap[n(c)]?.fallback ?? '???'
const bgCover = (v: unknown): string => {
  const raw = s(v)
  if (!raw) return staticUrl('img/cover.png')
  return raw.startsWith('http') || raw.startsWith('/') ? raw : coverUrl(raw)
}

export default function UserPage() {
  const { pathname } = useLocation()
  const { session, isLogin } = useSession()
  const m = pathname.match(/\/accounts\/user\/(\d+)/)
  const uid = m ? Number(m[1]) : (session?.uid ?? 0)
  const myUid = session?.uid ?? 0
  const isMe = isLogin && myUid === uid
  const isOther = isLogin && myUid !== uid

  const { data, reload } = useLoad<UserData>(
    async () => {
      const [infoRes, rankRes, actRes, chartRes, achRes] = await Promise.all([
        fetchPlayerInfo({ uid }).catch(() => undefined),
        fetchPlayerAllRank({ uid }).catch(() => undefined),
        fetchPlayerActivity({ uid }).catch(() => undefined),
        fetchPlayerCharts({ uid }).catch(() => undefined),
        fetchAchieveList(uid).catch(() => undefined),
      ])
      const info: Rec = ((infoRes as Rec | undefined)?.data ?? {}) as Rec
      return {
        info,
        ranks: asArray<Rec>((rankRes as Rec | undefined)?.data ?? rankRes),
        acts: asArray<Rec>((actRes as Rec | undefined)?.data ?? actRes),
        recent: asArray<Rec>((actRes as Rec | undefined)?.recent ?? []),
        charts: asArray<Rec>((chartRes as Rec | undefined)?.data ?? chartRes),
        achieves: asArray<Rec>((achRes as Rec | undefined)?.data ?? (achRes as Rec | undefined)?.list ?? achRes),
        content: s(info.content ?? info.wiki ?? info.userpage),
        friendType: n(info.friend_type ?? info.friendType, 0),
        tab: n(info.tab, 0),
        group: asArray<Rec>(info.group),
        unread: n(info.unread, 0),
        canBan: Boolean(info.canban),
        canActive: Boolean(info.canactive),
        canEdit: Boolean(info.can_edit ?? info.canEdit),
        redName: Boolean(info.red_name ?? info.redName),
        banner: s(info.banner_url ?? info.bannerUrl ?? info.banner),
      }
    },
    [uid],
    FALLBACK,
  )

  const [tab, setTab] = useState<number>(0)
  const [friendType, setFriendType] = useState<number>(0)
  const [achieves, setAchieves] = useState<Rec[]>([])
  const [editAch, setEditAch] = useState(false)
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

  /* module/user：好友切换 */
  const toggleFriend = async (add: boolean) => {
    try {
      await postForm('/account/friend/toggle', { body: { uid: String(uid), add: add ? '1' : '0' } })
    } catch {
      /* 接口不可用时仍保留本地反馈 */
    }
    setFriendType(add ? 1 : 0)
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

  /* achieve 展示编辑（module/achieve 的 del_mazz） */
  const removeAchieve = async (item: Rec, index: number) => {
    const id = s(item.id ?? item.achieve?.id)
    try {
      await operateAchieve({ type: 'del_mazz', id })
    } catch {
      /* ignore */
    }
    setAchieves((prev: Rec[]) => prev.filter((_: Rec, i: number) => i !== index))
    showNotify('Delete success', 'succ')
  }

  const info = data.info
  const username = s(info.username ?? info.name)

  return (
    <Shell variant="wide" title={username || 'User'} css={['profile.css', 'user.css']} contCls="gb_profile">
      <div className="user_head g_rblock">
        <div className="coverb">
          <img className="g_round" src={avatarUrl(info.avatar, uid)} alt={username} />
        </div>

        <div className="right">
          <p className="name">
            {data.redName
              ? <span style={{ color: '#ef6666' }}>{username}</span>
              : <span>{username}</span>}
            {data.group.filter((g: Rec) => n(g.id) > 1).map((g: Rec, i: number) => (
              <em key={i}>{s(g.name)}</em>
            ))}
          </p>

          <p className="time">
            <span>Joined since:&nbsp;{ymd(info.regtime ?? info.date_joined)}</span>
            <span>Last play:&nbsp;{(info.lastPlay ?? info.last_play) ? ymd(info.lastPlay ?? info.last_play) : 'Never'}</span>
            <span>Played: {s(info.playtime_str ?? info.playTimeStr)}</span>
          </p>
          <p>
            <span>Gender:&nbsp;{genderLabel(info.gender)}</span>
            <span>Age:&nbsp;{s(info.age)}</span>
            <span>Location:&nbsp;{countryLabel(info.country ?? info.area)}</span>
          </p>
          <p>
            <span>Gold:&nbsp;{n(info.gold)}</span>
            {n(info.gold_d ?? info.goldD) > 0 && (
              <span style={{ marginLeft: '10px' }}>Income:&nbsp;{n(info.gold_d ?? info.goldD)}</span>
            )}
            {n(info.playedtime ?? info.played_time) > 0 && (
              <span style={{ marginLeft: '10px' }}>Charts been played:&nbsp;{s(info.playedtime_str)}</span>
            )}
          </p>
          <p>
            <span>Stable charts:&nbsp;{n(info.count_2 ?? info.stableCount)}</span>
            <span>Unstable charts:&nbsp;{n(info.count_1 ?? info.unstableCount)}</span>
            {n(info.count_0 ?? info.slot) > 0 && <span>Chart slot:&nbsp;{n(info.count_0 ?? info.slot)}</span>}
          </p>
        </div>

        <div className="tool">
          {data.canBan && (
            <a href="#" className="btn g_toolbtn l" title="Ban" data-type="ban" onClick={(e) => { e.preventDefault(); void operation('ban') }}><i></i></a>
          )}
          {data.canActive && (
            <a href="#" className="btn g_toolbtn ul" title="Active" data-type="active" onClick={(e) => { e.preventDefault(); void operation('active') }}><i></i></a>
          )}
          {isOther && (
            <a href={`/talk/user/${uid}/${myUid}`} className="g_toolbtn ml" title="Messages"><i></i></a>
          )}
          {isMe && (
            <>
              <a href={URLS.notify} className="g_toolbtn w" title="View notification">
                <i></i>{data.unread > 0 && <em></em>}
              </a>
              <a href={URLS.talkUser} className="g_toolbtn ml" title="Messages"><i></i></a>
            </>
          )}
          {isOther && (
            friendType > 0 ? (
              <a href="#" id="J_friend" className="btn g_toolbtn ulk2" data-type="unf"
                title={friendType === 2 ? 'Revoke mutual friend' : 'Revoke friend'}
                onClick={(e) => { e.preventDefault(); void toggleFriend(false) }}><i></i></a>
            ) : (
              <a href="#" id="J_friend" className="btn g_toolbtn lk" data-type="addf" title="Add friend"
                onClick={(e) => { e.preventDefault(); void toggleFriend(true) }}><i></i></a>
            )
          )}
          {isMe && (
            <>
              <a href={URLS.invite} className="g_toolbtn in" title="Invite Code"><i></i></a>
              <a href={URLS.friend} className="g_toolbtn f" title="My Friends"><i></i></a>
            </>
          )}
          {isOther && data.canEdit && (
            <a href={`/upload/avatar?uid=${uid}`} title="Edit" className="g_toolbtn e"><i></i></a>
          )}
          {isMe && (
            <a href={URLS.configProfile} title="Edit" className="g_toolbtn e"><i></i></a>
          )}
        </div>
      </div>

      <div className="body">
        <div className="panel">
          <div className="rank g_rblock">
            {data.ranks.length > 0 ? data.ranks.map((item: Rec, i: number) => (
              <div className="item" key={i}>
                <img src={staticUrl(`img/mode/mode-${n(item.mode)}.png`)} alt="mode" />
                <div className="right">
                  <p className="rank">#{s(item.exp_rank ?? item.rank ?? item.gradeRank)}</p>
                  <p>
                    <span>Exp.{s(item.exp ?? item.value)}</span>
                    <span>Playcount:{s(item.playcount)}</span>
                  </p>
                  <p>
                    <span>Acc.{fmt2(item.acc)}%</span>
                    <span>Combo:{s(item.combo)}</span>
                  </p>
                </div>
              </div>
            )) : 'No score record'}
          </div>

          {achieves.length > 0 && (
            <div className="ach g_rblock">
              <a href={`/accounts/user/achieve/${uid}`}>
                <JustifyRow>
                  {achieves.map((item: Rec, i: number) => (
                    <img key={i} src={s(item.cover ?? item.achieve?.cover)} alt="achieve" />
                  ))}
                  {[0, 1, 2, 3, 4].map((i: number) => <img className="justfyHold" key={`h${i}`} alt="" />)}
                </JustifyRow>
              </a>
              <span className="justfix"></span>
              <span className="edit" onClick={() => { setEditAch((v: boolean) => !v) }}>Edit</span>
              {editAch && achieves.map((item: Rec, i: number) => (
                <span className="del" key={`d${i}`} onClick={() => void removeAchieve(item, i)}>×</span>
              ))}
            </div>
          )}
        </div>

        <div className="record">
          <div className="option g_rblock">
            <a href="#" className={`btn ${tab === 0 ? 'curr' : ''}`} data-type="active" onClick={(e) => { e.preventDefault(); switchTab('Recent activities', 0) }}>Recent activities</a>
            <a href="#" className={`btn ${tab === 1 ? 'curr' : ''}`} data-type="recent" onClick={(e) => { e.preventDefault(); switchTab('Recent high scores', 1) }}>Recent high scores</a>
            {data.charts.length > 0 && (
              <a href="#" className={`btn ${tab === 2 ? 'curr' : ''}`} data-type="chart" onClick={(e) => { e.preventDefault(); switchTab('Chart', 2) }}>Chart</a>
            )}
            <a href="#" className={`btn ${tab === 3 ? 'curr' : ''}`} data-type="wiki" onClick={(e) => { e.preventDefault(); switchTab('Profile', 3) }}>Profile</a>
          </div>

          <div className={`wiki g_rblock ${tab === 3 ? 'curr' : ''}`}>
            {(isMe || data.canEdit) && (
              <div className="tool">
                <a href={URLS.userpageEdit(uid)} className="g_toolbtn e"><i></i></a>
              </div>
            )}
            {data.content && (
              <div className="g_wiki userpage" dangerouslySetInnerHTML={{ __html: `${data.content}<span class="clear"></span>` }}></div>
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
                      <span className="mod">{s(item.mod)}</span>
                      <span className="time">{s(item.time_from_now ?? formatTime(item.time))}</span>
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
                return (
                  <div className="item g_rblock" key={i}>
                    <div className="cover" style={{ backgroundImage: `url(${bgCover(song.cover_url ?? song.cover)})` }}></div>
                    <div className="right">
                      <p className="textfix title">
                        <img src={staticUrl(`img/mode/mode-${n(item.mode)}.png`)} alt="mode" />
                        <a href={URLS.chartPage(item.id ?? item.cid)}>{s(song.title)} - {s(item.display_version ?? item.version)}</a>
                      </p>
                      <p>Length: {s(item.length)}s&nbsp;&nbsp; Hot: {s(item.playcount ?? item.hot)}</p>
                      <p><span className="time">{s(item.lastedit_str ?? formatTime(item.lastedit))}</span></p>
                    </div>
                  </div>
                )
              })}
              <div className="more g_rblock"><a href={`${URLS.chart}?uid=${uid}`}>Show All</a></div>
            </div>
          )}
        </div>
        <span className="clear"></span>
      </div>
    </Shell>
  )
}
