const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '')

type FetchOptions = {
  params?: Record<string, string | number | undefined>
}

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

const getJson = async <T>(path: string, options?: FetchOptions): Promise<T> => {
  const url = buildUrl(path, options?.params)
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

export const fetchBasicInfo = () => getJson<RespBasicInfo>('/push/info/wt')

export const fetchStoreList = (params?: { mode?: number; beta?: number; from?: number; free?: number; word?: string }) =>
  getJson<RespStoreList>('/store/list', { params })

export const fetchStorePromote = (params?: { mode?: number; from?: number; free?: number }) =>
  getJson<RespStoreList>('/store/promote', { params })
