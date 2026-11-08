import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { URLS, staticUrl } from '../lib/urls'
import { useSession } from './SessionProvider'
import { LoginModal } from './LoginModal'
import { fetchUnreadMsg } from '../network/legacy'
import { fetchPlayerInfo } from '../network/api'
import { avatarFallbackUrl, avatarUrl } from '../utils/formatters'
import { t as i18nT } from '../i18n'

/* /player/image 是头像上传签名接口（返回 JSON），不能直接当 <img src>。
 * 头像文件名取自 /player/info 的 avatar，按 uid 缓存，避免每次挂载 Header 都重复请求。 */
const avatarCache = new Map<number, string>()

/** 复刻老站 templates/widget/header.html 的 DOM 与 class */
export function Header() {
  const { session, isLogin } = useSession()
  const [loginOpen, setLoginOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [unread, setUnread] = useState(false)
  const navigate = useNavigate()
  const uid = isLogin ? session?.uid ?? 0 : 0
  const [avatar, setAvatar] = useState<string>(() => avatarCache.get(uid) ?? avatarFallbackUrl())

  useEffect(() => {
    if (!uid) return
    const cached = avatarCache.get(uid)
    if (cached) {
      setAvatar(cached)
      return
    }
    let alive = true
    fetchPlayerInfo({ uid })
      .then((resp) => {
        // /player/info 是扁平结构（avatar 在顶层），兼容带 data 包裹的形式
        const info = ((resp as { data?: { avatar?: string } } | undefined)?.data ?? resp) as { avatar?: string } | undefined
        const url = avatarUrl(info?.avatar, uid)
        avatarCache.set(uid, url)
        if (alive) setAvatar(url)
      })
      .catch(() => {
        // 取不到时保持默认头像
      })
    return () => {
      alive = false
    }
  }, [uid])

  // 老站 util.js:246-276 每 6 分钟轮询未读消息，有未读才显示 .notify 气泡
  useEffect(() => {
    let alive = true
    let timer: number | undefined
    const poll = async () => {
      try {
        const resp = await fetchUnreadMsg()
        const count = Number(resp?.data ?? resp?.num ?? 0)
        if (alive && count > 0) setUnread(true)
      } catch {
        // 轮询失败（含业务负 code）保持隐藏，等待下一轮
      }
      if (alive) timer = window.setTimeout(poll, 6 * 60 * 1000)
    }
    void poll()
    return () => {
      alive = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <header id="header">
        <div className="center">
          <span><img src={staticUrl('img/icon-64.png')} alt="" /><a href="/index">Malody</a></span>
          <div className="menu">
            <a href={URLS.talk}><i className="icon-ta"></i>{i18nT('Talk')}</a>
            {isLogin && <a href={URLS.store}><i className="icon-st"></i>{i18nT('Store')}</a>}
            <a href={URLS.skin}><i className="icon-sk"></i>{i18nT('Skin')}</a>
            <a href={`${URLS.chart}?type=3`}><i className="icon-ch"></i>{i18nT('Chart')}</a>
            <a href={URLS.player}><i className="icon-pl"></i>{i18nT('Player')}</a>
          </div>
          {isLogin ? (
            <>
              <a href={URLS.logout}>{i18nT('Logout')}</a>
              <Link to={URLS.user(session?.uid ?? 0)}><b>{session?.username}</b></Link>
              <Link to={URLS.user(session?.uid ?? 0)} className="avatar">
                <img src={avatar} alt="" />
              </Link>
            </>
          ) : (
            <>
              <Link to={URLS.register}>{i18nT('Register')}</Link>
              <a style={{ fontWeight: 'bold' }} id="J_toplogin" href="#" onClick={(e) => { e.preventDefault(); setLoginOpen(true) }}>{i18nT('Sign in')}</a>
            </>
          )}
          <form
            action={URLS.search}
            id="J_search_form"
            className="search g_round"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`${URLS.search}?keyword=${encodeURIComponent(keyword)}`)
            }}
          >
            <input type="text" name="keyword" id="J_search" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <input type="submit" value="" id="J_search_submit" />
          </form>
          <div className="notify g_round" style={{ display: unread ? 'block' : 'none' }}>
            <Link to={URLS.notify}>{i18nT('You have new message(s)')}</Link>
          </div>
        </div>
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
