import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { SESSION_EXPIRED_EVENT, getSession, setSession, type AuthSession } from '../network/api'
import { showNotify } from '../lib/legacy'
import { t as i18nT } from '../i18n'

type SessionCtx = {
  session?: AuthSession
  isLogin: boolean
  signIn: (s: AuthSession) => void
  signOut: () => void
  refresh: () => void
}

const Ctx = createContext<SessionCtx>({
  isLogin: false,
  signIn: () => {},
  signOut: () => {},
  refresh: () => {},
})

export const useSession = () => useContext(Ctx)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setS] = useState<AuthSession | undefined>(() => getSession())

  const refresh = useCallback(() => setS(getSession()), [])

  useEffect(() => {
    // 游客 token 是异步签发的，签发后同步一次顶部导航状态
    const timer = window.setTimeout(refresh, 400)
    const onStorage = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener('malody:session', onStorage)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('malody:session', onStorage)
    }
  }, [refresh])

  const signIn = useCallback((s: AuthSession) => {
    setSession(s)
    setS(s)
    window.dispatchEvent(new Event('malody:session'))
  }, [])

  const signOut = useCallback(() => {
    setSession(undefined)
    setS(undefined)
    window.dispatchEvent(new Event('malody:session'))
  }, [])

  useEffect(() => {
    /** 请求层撞到 -1000 时已清掉 localStorage；这里同步 React 状态并给出
     *  可见提示，避免「顶部仍显示已登录、请求全部静默失败」。 */
    const onSessionExpired = () => {
      signOut()
      showNotify(i18nT('Please login'), 'err')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [signOut])

  return (
    <Ctx.Provider value={{ session, isLogin: !!session && session.uid > 1, signIn, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  )
}
