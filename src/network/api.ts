const API_BASE = (import.meta.env.VITE_API_BASE ?? 'https://api.mugzone.net/api').replace(/\/$/, '')
const resolveApiOrigin = () => {
  if (typeof window === 'undefined') return undefined
  try {
    const url = new URL(API_BASE, window.location.origin)
    return url.origin
  } catch {
    return undefined
  }
}
const apiOrigin = resolveApiOrigin()
const canSendCustomHeaders = typeof window === 'undefined' || apiOrigin === window.location.origin

type FetchOptions = {
  params?: Record<string, string | number | undefined>
  /** Defaults to true for non-/wt endpoints */
  auth?: boolean
  headers?: Record<string, string>
}

export type PackBase = {
  code: number
  message?: string
}

export type RespActivationCode = {
  code: number
}

export type RespImageUpload = {
  code: number
  url?: string
  meta?: Record<string, string>
}

export type AuthSession = {
  uid: number
  key: string
  storeKey?: string
  username?: string
  groups?: number[]
}

const STORAGE_KEY = 'auth_key'
const STORAGE_UID = 'auth_uid'
const STORAGE_STORE_KEY = 'auth_store_key'
const STORAGE_USERNAME = 'auth_username'
const STORAGE_GROUPS = 'auth_groups'

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
  const username = localStorage.getItem(STORAGE_USERNAME) ?? undefined
  const groupsRaw = localStorage.getItem(STORAGE_GROUPS)
  if (!key || !uid) return undefined
  const parsedUid = Number(uid)
  if (!Number.isFinite(parsedUid)) return undefined
  const groups = groupsRaw ? groupsRaw.split(',').map((g) => Number(g)).filter((n) => Number.isFinite(n)) : undefined
  cachedSession = { uid: parsedUid, key, storeKey: storeKey || undefined, username: username || undefined, groups }
  return cachedSession
}

export const setSession = (session?: AuthSession) => {
  cachedSession = session
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_UID)
    localStorage.removeItem(STORAGE_STORE_KEY)
    localStorage.removeItem(STORAGE_USERNAME)
    localStorage.removeItem(STORAGE_GROUPS)
    return
  }
  localStorage.setItem(STORAGE_KEY, session.key)
  localStorage.setItem(STORAGE_UID, String(session.uid))
  if (session.storeKey) {
    localStorage.setItem(STORAGE_STORE_KEY, session.storeKey)
  } else {
    localStorage.removeItem(STORAGE_STORE_KEY)
  }
  if (session.username) {
    localStorage.setItem(STORAGE_USERNAME, session.username)
  } else {
    localStorage.removeItem(STORAGE_USERNAME)
  }
  if (session.groups?.length) {
    localStorage.setItem(STORAGE_GROUPS, session.groups.join(','))
  } else {
    localStorage.removeItem(STORAGE_GROUPS)
  }
}

export const getSession = (): AuthSession | undefined => {
  return loadStoredSession()
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

const CLIENT_VER = 1
const MALODY_VERSION = '6.3.22'
const buildVersionHeader = (clientVersion?: string) => {
  if (!canSendCustomHeaders) return undefined
  return { Malody: clientVersion ?? MALODY_VERSION }
}

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
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...(options?.headers ?? {}),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
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
  const res = await fetch(url, { credentials: 'include', headers: options?.headers })
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

export type RespPlayerInfoData = {
  uid?: number
  username?: string
  name?: string
  avatar?: string
  sign?: string
  gold?: number
  goldD?: number
  gold_d?: number
  level?: number
  exp?: number
  playcount?: number
  acc?: number
  combo?: number
  mmr?: number
  regtime?: number
  gender?: number
  area?: number
  country?: number
  birth?: number
  lastPlay?: number
  last_play?: number
  playTime?: number
  play_time?: number
  playedTime?: number
  played_time?: number
  stableCharts?: number
  unstableCharts?: number
  chartSlot?: number
  stableCount?: number
  unstableCount?: number
  slot?: number
  count_2?: number
  count_1?: number
  count_0?: number
}

export type RespPlayerInfo = {
  code: number
  data?: RespPlayerInfoData
}

export type RespPlayerActivityItem = {
  time?: number
  text?: string
  type?: string
  value?: string
  msg?: string
  desc?: string
  link?: string
}

export type RespPlayerActivity = {
  code: number
  data?: RespPlayerActivityItem[]
}

export type RespPlayerChartItem = {
  cid: number
  sid?: number
  title?: string
  artist?: string
  cover?: string
  mode?: number
  version?: string
  level?: number
  lastedit?: number
}

export type RespPlayerChartList = {
  code: number
  data?: RespPlayerChartItem[]
}

export type RespPlayerAllRankItem = {
  mode?: number
  rank?: number
  value?: number
  acc?: number
  combo?: number
  level?: number
}

export type RespPlayerAllRank = {
  code: number
  data?: RespPlayerAllRankItem[]
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

export type RespStoreEventItem = {
  eid: number
  scoreId?: number
  scoreID?: number
  active?: boolean
  cover?: string
  start?: string | number
  end?: string | number
  name?: string
  type?: string | number
  wiki?: number
}

export type RespStoreEvent = {
  code: number
  hasMore?: boolean
  next?: number
  data?: RespStoreEventItem[]
}

export type RespEventChartItem = {
  sid: number
  cid: number
  uid?: number
  creator?: string
  title?: string
  artist?: string
  version?: string
  level?: number
  length?: number
  type?: number
  cover?: string
  mode?: number
  time?: number
  hot?: number
  like?: number
  dislike?: number
}

export type RespEventChart = {
  code: number
  data?: RespEventChartItem[]
  hasMore?: boolean
  next?: number
}

export type RespRankingEventItem = {
  index?: number
  score?: number
  uid: number
  username?: string
}

export type RespRankingEvent = {
  code: number
  data?: RespRankingEventItem[]
}

export type RespEventCreate = {
  code: number
}

export type RespSkinListItem = {
  id: number
  uid?: number
  creator?: string
  name: string
  price: number
  preview?: string
  cover?: string
  buy?: boolean
  hot?: number
  mode?: number
  time?: number
}

export type RespSkinList = {
  code: number
  hasMore?: boolean
  next?: number
  data?: RespSkinListItem[]
}

export type RespSkinBuyData = {
  id: number
  name?: string
  url?: string
}

export type RespSkinBuy = {
  code: number
  data?: RespSkinBuyData
}

export type RespTagMeta = {
  id: number
  name: string
  type: number
}

export type RespSongInfo = {
  code: number
  sid: number
  title: string
  artist: string
  titleOrg?: string
  artistOrg?: string
  cover?: string
  length?: number
  bpm?: number
  tags?: number[]
  tagOptions?: RespTagMeta[]
}

export type RespSongChartsItem = {
  cid: number
  uid?: number
  creator?: string
  version?: string
  length?: number
  level?: number
  type?: number
  mode?: number
  time?: number
}

export type RespSongCharts = {
  code: number
  data?: RespSongChartsItem[]
  hasMore?: boolean
  next?: number
}

export type RespChartInfo = {
  code: number
  sid?: number
  cid: number
  title?: string
  artist?: string
  cover?: string
  creator?: string
  type?: number
  uid?: number
  publisher?: string
  publisherId?: number
  version?: string
  mode?: number
  length?: number
  level?: number
  freeStyle?: number
  offset?: number
  hide?: boolean
  checksum?: string
  tags?: number[]
  tagOptions?: RespTagMeta[]
  like?: number
  dislike?: number
  likeState?: number
}

export type RespRankingItem = {
  uid: number
  username: string
  avatar?: string
  score: number
  combo: number
  acc: number
  fc?: boolean
  judge?: number
  rank?: number
  mod?: number
  time?: number
  best?: number
  cool?: number
  good?: number
  miss?: number
  ranking?: number
  pro?: boolean
}

export type RespRankingMeta = {
  level?: number
  rankStatus?: number
}

export type RespRanking = {
  code: number
  cid?: number
  sid?: number
  meta?: RespRankingMeta
  data?: RespRankingItem[]
}

export type RespCommentItem = {
  tid: number
  name: string
  uid: number
  time: number
  content: string
  num?: number
  active?: number
  playTime?: number
}

export type RespCommentList = {
  code: number
  data?: RespCommentItem[]
  next?: number
  hasMore?: boolean
}

export type RespCommentAdded = {
  code: number
  tid?: number
  time?: number
  num?: number
}

export type RespChartDonate = {
  gold: number
  time: number
  uid: number
  username?: string
  active?: number
  playTime?: number
}

export type RespChartDonateList = {
  code: number
  data?: RespChartDonate[]
}

export type RespWiki = {
  code: number
  wiki?: string
  raw?: boolean
  title?: string
  locked?: boolean
}

export type RespWikiSearchItem = {
  pid: number
  title: string
}

export type RespWikiSearch = {
  code: number
  data?: RespWikiSearchItem[]
}

export type RespSaveWiki = {
  code: number
}

export type RespWikiTemplate = {
  code: number
  name?: string
  data?: unknown
  message?: string
}

export type RespCreateWiki = {
  code: number
  id?: number
  exist?: number
}

export type RespPushNews = {
  code: number
}

export type RespPlayerSearchItem = {
  uid: number
  username: string
}

export type RespPlayerSearch = {
  code: number
  data?: RespPlayerSearchItem[]
}

export const fetchBasicInfo = () => getJson<RespBasicInfo>('/push/info/wt', { auth: false })

export const fetchStoreList = (
  params?: {
    mode?: number
    beta?: number
    from?: number
    free?: number
    word?: string
    lvge?: number
    lvle?: number
    __v__?: string
    mcver?: number
  },
  options?: { clientVersion?: string },
) =>
  getJson<RespStoreList>('/store/list', {
    params: { __v__: MALODY_VERSION, mcver: CLIENT_VER, ...params },
    headers: buildVersionHeader(options?.clientVersion),
  })

export const fetchStorePromote = (
  params?: { mode?: number; from?: number; free?: number; __v__?: string },
  options?: { clientVersion?: string },
) =>
  getJson<RespStoreList>('/store/promote', {
    params: { __v__: MALODY_VERSION, mcver: CLIENT_VER, ...params },
    headers: buildVersionHeader(options?.clientVersion),
  })

export const fetchPlayerInfo = (params: { uid: number; ver?: number; bver?: number }) =>
  getJson<RespPlayerInfo>('/player/info', {
    params: { touid: params.uid, ver: params.ver, bver: params.bver },
  })

export const fetchPlayerActivity = (params: { uid: number }) =>
  getJson<RespPlayerActivity>('/player/activity', { params: { touid: params.uid } })

export const fetchPlayerCharts = (params: { uid: number; from?: number; order?: number; mode?: number }) =>
  getJson<RespPlayerChartList>('/community/player/chart', {
    params: {
      touid: params.uid,
      from: params.from,
      order: params.order,
      mode: params.mode,
    },
  })

export const fetchPlayerAllRank = (params: { uid: number }) =>
  getJson<RespPlayerAllRank>('/ranking/player/all', { params: { touid: params.uid } })

export const savePlayerInfo = (payload: {
  name?: string
  birth?: string
  gender?: number
  area?: number
}) =>
  postForm<PackBase>('/player/info', {
    body: {
      name: payload.name,
      birth: payload.birth,
      gender: payload.gender,
      area: payload.area,
    },
  })

export const submitActivationCode = (payload: { code: string }) =>
  postForm<RespActivationCode>('/player/code', { body: { code: payload.code } })

export const fetchPlayerImageUpload = (params: { type: number; touid?: number }) =>
  getJson<RespImageUpload>('/player/image', { params })

export const fetchGlobalRank = (params: { mm?: number; mode?: number; from?: number; ver?: number; bver?: number }) =>
  getJson<RespGlobalRank>('/ranking/global', { params })

export const fetchStoreEvents = (params?: { active?: number; from?: number }) =>
  getJson<RespStoreEvent>('/store/events', { params })

export const fetchEventCharts = async (params: { eid: number; org?: number; from?: number }) => {
  try {
    return await getJson<RespEventChart>('/event/event', { params })
  } catch (err) {
    return getJson<RespEventChart>('/events/event', { params })
  }
}

export const createEvent = (payload: {
  eid?: number
  name: string
  type: number
  start: string
  end: string
  cids: string
  cover?: string
  wiki?: number
}) =>
  postForm<RespEventCreate>('/event/create', {
    body: {
      eid: payload.eid,
      name: payload.name,
      type: payload.type,
      start: payload.start,
      end: payload.end,
      cids: payload.cids,
      cover: payload.cover,
      wiki: payload.wiki,
    },
  })

export const fetchEventCoverUpload = (params: { eid: number; type?: number }) =>
  getJson<RespImageUpload>('/event/image', { params: { ...params, type: params.type ?? 1 } })

export const fetchSkinList = (params?: {
  uid?: number
  mode?: number
  word?: string
  from?: number
  sid?: number
}) =>
  getJson<RespSkinList>('/skin/list', { params })

export const fetchSkinDetail = (params: { sid: number }) => fetchSkinList({ sid: params.sid })

export const buySkin = (payload: { sid: number }) =>
  postForm<RespSkinBuy>('/skin/buy', { body: { sid: payload.sid, id: payload.sid } })

export const fetchSongInfo = (params: { sid: number; org?: number; meta?: number }) =>
  getJson<RespSongInfo>('/community/song/info', { params })

export const saveSongInfo = (payload: {
  sid: number
  title: string
  artist: string
  length: number
  bpm: number
  titleOrg?: string
  artistOrg?: string
  tags?: number[]
}) =>
  postForm<PackBase>('/community/song/info', {
    body: {
      sid: payload.sid,
      title: payload.title,
      artist: payload.artist,
      length: payload.length,
      bpm: payload.bpm,
      orgt: payload.titleOrg,
      orga: payload.artistOrg,
      tags: payload.tags !== undefined ? JSON.stringify(payload.tags) : undefined,
    },
  })

export const fetchSongCoverUpload = (params: { sid: number }) =>
  getJson<RespImageUpload>('/community/song/cover', { params })

export const fetchSongCharts = (params: { sid: number }) =>
  getJson<RespSongCharts>('/community/song/charts', { params })

export const fetchChartInfo = (params: { cid: number; hash?: string; org?: number; meta?: number }) =>
  getJson<RespChartInfo>('/community/chart/info', { params })

export const clearChartRanking = (payload: { cid: number }) =>
  postForm<PackBase>('/ranking/clear', {
    body: {
      cid: payload.cid,
    },
  })

export const saveChartInfo = (payload: {
  cid: number
  version?: string
  creator?: number
  length?: number
  level?: number
  mode?: number
  free?: number
  type?: number
  hide?: boolean
  offset?: number
  tags?: number[]
}) =>
  postForm<PackBase>('/community/chart/info', {
    body: {
      cid: payload.cid,
      version: payload.version,
      creator: payload.creator,
      length: payload.length,
      level: payload.level,
      mode: payload.mode,
      free: payload.free,
      type: payload.type,
      hide: payload.hide === undefined ? undefined : payload.hide ? 'True' : 'False',
      offset: payload.offset,
      tags: payload.tags !== undefined ? JSON.stringify(payload.tags) : undefined,
    },
  })

export const likeChart = (payload: { cid: number; state: number; hash?: string; score?: string; n?: number; choice?: number }) =>
  postForm<PackBase>('/community/chart/like', {
    body: {
      cid: payload.cid,
      hash: payload.hash,
      state: payload.state,
      score: payload.score,
      n: payload.n,
      choice: payload.choice,
    },
  })

export const fetchRankingList = (params: { cid: number; pro?: number; order?: number; hash?: string; ver?: number; bver?: number }) =>
  getJson<RespRanking>('/ranking/list', { params })

export const fetchEventRanking = (params: { eid: number }) =>
  getJson<RespRankingEvent>('/ranking/event', { params })

export const fetchComments = (params: { cid: number; from?: number; ver?: number; bver?: number }) =>
  getJson<RespCommentList>('/comment/list', { params })

export const addComment = (payload: { cid: number; content: string }) =>
  postForm<RespCommentAdded>('/comment/add', { body: { cid: payload.cid, content: payload.content } })

export const deleteComment = (payload: { tid: number }) => postForm<PackBase>('/comment/delete', { body: { tid: payload.tid } })

export const fetchChartDonateList = (params: { cid: number }) => getJson<RespChartDonateList>('/community/chart/donate', { params })

export const donateChart = (payload: { cid: number; gold: number }) =>
  postForm<PackBase>('/community/chart/donate', { body: { cid: payload.cid, gold: payload.gold } })

export const fetchWiki = (params: {
  lang?: number
  touid?: number
  sid?: number
  cid?: number
  pid?: number
  raw?: number
}) =>
  getJson<RespWiki>('/community/wiki', { params })

export const searchWiki = (params: { keyword: string }) =>
  getJson<RespWikiSearch>('/community/wiki/search', { params })

export const saveWiki = (payload: {
  wiki: string
  lang?: number
  touid?: number
  sid?: number
  cid?: number
  pid?: number
  uid: number
}) =>
  postForm<RespSaveWiki>('/community/wiki', {
    params: { uid: payload.uid },
    body: {
      wiki: payload.wiki,
      lang: payload.lang,
      touid: payload.touid,
      sid: payload.sid,
      cid: payload.cid,
      pid: payload.pid,
    },
  })

export const fetchWikiTemplate = (params: { name: string } & Record<string, string | number | undefined>) =>
  getJson<RespWikiTemplate>('/web/wiki/template', { params })

export const createWikiPage = (payload: { uid: number; title: string; type?: number }) =>
  postForm<RespCreateWiki>('/community/wiki/create', {
    params: { uid: payload.uid },
    body: { title: payload.title, type: payload.type ?? 1 },
  })

export const lockWikiPage = (payload: { pid: number; uid: number; locked: number }) =>
  postForm<PackBase>('/community/wiki/lock', {
    params: { uid: payload.uid },
    body: { pid: payload.pid, locked: payload.locked },
  })

export const updateWikiTitle = (payload: { pid: number; uid: number; title: string }) =>
  postForm<PackBase>('/community/wiki/title', {
    params: { uid: payload.uid },
    body: { pid: payload.pid, title: payload.title },
  })

export const deleteWikiPage = (payload: { pid: number; uid: number }) =>
  postForm<PackBase>('/community/wiki/delete', {
    params: { uid: payload.uid },
    body: { pid: payload.pid },
  })

export const toggleWikiNews = (payload: { pid: number; uid: number }) =>
  postForm<RespPushNews>('/push/news', {
    params: { uid: payload.uid },
    body: { pid: payload.pid },
  })

export const searchPlayer = (params: { keyword: string; ver?: number; bver?: number }) =>
  getJson<RespPlayerSearch>('/player/search', { params })

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
