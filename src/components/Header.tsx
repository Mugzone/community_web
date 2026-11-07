import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { URLS, staticUrl } from '../lib/urls'
import { useSession } from './SessionProvider'
import { LoginModal } from './LoginModal'
import { fetchUnreadMsg } from '../network/legacy'

/** 复刻老站 templates/widget/header.html 的 DOM 与 class */
export function Header() {
  const { session, isLogin } = useSession()
  const [loginOpen, setLoginOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [unread, setUnread] = useState(false)
  const navigate = useNavigate()

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
            <a href={URLS.talk}><i className="icon-ta"></i>Talk</a>
            {isLogin && <a href={URLS.store}><i className="icon-st"></i>Store</a>}
            <a href={URLS.skin}><i className="icon-sk"></i>Skin</a>
            <a href={`${URLS.chart}?type=3`}><i className="icon-ch"></i>Chart</a>
            <a href={URLS.player}><i className="icon-pl"></i>Player</a>
          </div>
          {isLogin ? (
            <>
              <a href={URLS.logout}>Logout</a>
              <Link to={URLS.user(session?.uid ?? 0)}><b>{session?.username}</b></Link>
              <Link to={URLS.user(session?.uid ?? 0)} className="avatar">
                <img src={`/api/player/image?uid=${session?.uid ?? 0}`} alt="" />
              </Link>
            </>
          ) : (
            <>
              <Link to={URLS.register}>Register</Link>
              <a style={{ fontWeight: 'bold' }} id="J_toplogin" href="#" onClick={(e) => { e.preventDefault(); setLoginOpen(true) }}>Sign in</a>
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
            <Link to={URLS.notify}>You have new message(s)</Link>
          </div>
        </div>
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
