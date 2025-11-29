const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')

type FetchOptions = {
  params?: Record<string, string | number | undefined>
  /** Defaults to true for non-/wt endpoints */
  auth?: boolean
}

export type AuthSession = {
  uid: number
  key: string
  storeKey?: string
}

const STORAGE_KEY = 'auth_key'
const STORAGE_UID = 'auth_uid'
const STORAGE_STORE_KEY = 'auth_store_key'

let cachedSession: AuthSession | undefined
let sessionPromise: Promise<AuthSession> | undefined

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const search = new URLSearchParams()

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return
      search.set(key, String(value))
    })
  }

  const query = search.toString()
  return `${cleanBase}${cleanPath}${query ? `?${query}` : ''}`
}

const loadStoredSession = (): AuthSession | undefined => {
  if (cachedSession) return cachedSession
  const key = localStorage.getItem(STORAGE_KEY)
  const uid = localStorage.getItem(STORAGE_UID)
  const storeKey = localStorage.getItem(STORAGE_STORE_KEY) ?? undefined
  if (!key || !uid) return undefined
  const parsedUid = Number(uid)
  if (!Number.isFinite(parsedUid)) return undefined
  cachedSession = { uid: parsedUid, key, storeKey: storeKey || undefined }
  return cachedSession
}

export const setSession = (session?: AuthSession) => {
  cachedSession = session
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_UID)
    localStorage.removeItem(STORAGE_STORE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, session.key)
  localStorage.setItem(STORAGE_UID, String(session.uid))
  if (session.storeKey) {
    localStorage.setItem(STORAGE_STORE_KEY, session.storeKey)
  } else {
    localStorage.removeItem(STORAGE_STORE_KEY)
  }
}

const fetchGuestSession = async (): Promise<AuthSession> => {
  const url = buildUrl('/web/auth/guest/wt')
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(`Guest token request failed: ${res.status}`)
  }
  const data = (await res.json()) as Partial<AuthSession>
  const key = data.key ?? (data as { token?: string }).token
  if (!key) {
    throw new Error('Guest token response missing key')
  }
  const storeKey = data.storeKey ?? (data as { tokenStore?: string }).tokenStore
  return { uid: data.uid ?? 1, key, storeKey }
}

const ensureSession = async (): Promise<AuthSession> => {
  const existing = loadStoredSession()
  if (existing) return existing
  if (!sessionPromise) {
    sessionPromise = fetchGuestSession()
      .then((session) => {
        setSession(session)
        return session
      })
      .finally(() => {
        sessionPromise = undefined
      })
  }
  return sessionPromise
}

type PostOptions = FetchOptions & {
  body?: Record<string, string | number | undefined>
}

const CLIENT_VER = 327935

const postForm = async <T>(path: string, options?: PostOptions): Promise<T> => {
  const requiresAuth = options?.auth ?? true
  const params: Record<string, string | number | undefined> = { ...(options?.params ?? {}) }
  const body: Record<string, string | number | undefined> = { ...(options?.body ?? {}) }

  if (requiresAuth) {
    const session = await ensureSession()
    const isStorePath = path.includes('/store/') || path.includes('/skin/')
    const keyToUse = isStorePath ? session.storeKey ?? session.key : session.key
    params.key ??= keyToUse
    params.uid ??= session.uid
  }

  const form = new URLSearchParams()
  Object.entries(body).forEach(([key, value]) => {
    if (value === undefined) return
    form.set(key, String(value))
  })

  const url = buildUrl(path, params)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    credentials: 'include',
    body: form.toString(),
  })

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

const getJson = async <T>(path: string, options?: FetchOptions): Promise<T> => {
  const requiresAuth = options?.auth ?? true
  const params = { ...(options?.params ?? {}) }

  if (requiresAuth) {
    const session = await ensureSession()
    const isStorePath = path.includes('/store/') || path.includes('/skin/')
    const keyToUse = isStorePath ? session.storeKey ?? session.key : session.key
    params.key ??= keyToUse
    params.uid ??= session.uid
  }

  const url = buildUrl(path, params)
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export type RespBasicInfoNews = {
  title?: string
  desc?: string
  link?: string
  time?: number
}

export type RespLogin = {
  code: number
  uid?: number
  username?: string
  token?: string
  tokenStore?: string
  gold?: number
  tcp?: string
  group?: number[]
}

export type RespBasicInfo = {
  code: number
  news?: RespBasicInfoNews[]
  banner?: string[]
}

export type RespStoreListItem = {
  sid: number
  title: string
  artist: string
  cover: string
  length: number
  bpm: number
  mode: number
  tags?: string[]
  lastedit: number
}

export type RespStoreList = {
  code: number
  hasMore?: boolean
  next?: number
  data?: RespStoreListItem[]
}

export type RespGlobalRankItem = {
  uid: number
  username: string
  avatar?: string
  value: number
  rank: number
  level?: number
  playcount?: number
  acc?: number
  combo?: number
}

export type RespGlobalRank = {
  code: number
  data?: RespGlobalRankItem[]
  hasMore?: boolean
  next?: number
}

export const fetchBasicInfo = () => getJson<RespBasicInfo>('/push/info/wt', { auth: false })

export const fetchStoreList = (params?: { mode?: number; beta?: number; from?: number; free?: number; word?: string }) =>
  getJson<RespStoreList>('/store/list', { params })

export const fetchStorePromote = (params?: { mode?: number; from?: number; free?: number }) =>
  getJson<RespStoreList>('/store/promote', { params })

export const fetchGlobalRank = (params: { mm?: number; mode?: number; from?: number; ver?: number; bver?: number }) =>
  getJson<RespGlobalRank>('/ranking/global', { params })

export const login = (payload: { name: string; psw: string; ver?: number; h?: string; bver?: number }) =>
  postForm<RespLogin>('/account/login/wt', {
    auth: false,
    body: {
      name: payload.name,
      psw: payload.psw,
      ver: payload.ver ?? CLIENT_VER,
      h: payload.h,
      bver: payload.bver,
    },
  })

export const register = (payload: {
  name: string
  psw: string
  email: string
  ver?: number
  h?: string
  bver?: number
}) =>
  postForm<RespLogin>('/account/register/wt', {
    auth: false,
    body: {
      name: payload.name,
      psw: payload.psw,
      email: payload.email,
      ver: payload.ver ?? CLIENT_VER,
      h: payload.h,
      bver: payload.bver,
    },
  })
