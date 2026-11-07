import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSession, setSession, type AuthSession } from '../network/api'

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

  return (
    <Ctx.Provider value={{ session, isLogin: !!session && session.uid > 1, signIn, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  )
}
