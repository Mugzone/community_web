import { get, post, type WebResp, type Params } from './pageBase'

export const fetchHomeData = () => get<WebResp>('/web/home/wt', undefined, false)

export const fetchIntroData = () => get<WebResp>('/web/intro/wt', undefined, false)

export const fetchLimitList = (page = 1) => get<WebResp>('/web/limit/wt', { page }, false)

export const fetchQuestList = () => get<WebResp>('/web/quest/wt', undefined, false)

export const fetchDailyList = () => get<WebResp>('/web/daily/wt', undefined, false)

export const fetchSpecialList = (name: string, page?: number, type?: string) => get<WebResp>('/web/special/wt', { name, page, type }, false)

export const fetchAllPages = (page = 1, type?: 'wiki' | 'song') => get<WebResp>('/web/all/wt', { page, type }, false)

// strict=1：目标语言没有译文时返回空正文（而不是英文回退），
// 前端据此露出「创建」入口，让用户为该语言写文。
export const fetchWikiLang = (key: string, lang: string, strict = false) =>
  get<WebResp>('/web/lang/wt', { key, lang, ...(strict ? { strict: 1 } : {}) }, false)

export const fetchCaptcha = (key?: string) => get<WebResp>('/web/captcha/wt', { key }, false)

export const fetchWikiSearch = (keyword: string, type?: string) =>
  get<WebResp>('/community/wiki/search', { keyword, type, web: 1 })

export const fetchWikiChange = (pageId: number | string) =>
  get<WebResp>('/community/wiki/change', { pid: pageId })

export const fetchWikiLatest = (page = 1) => get<WebResp>('/community/wiki/latest', { page })

export const fetchWikiBackup = (pageId: number | string) =>
  get<WebResp>('/community/wiki/backup', { pid: pageId })

export const saveWikiBackup = (pageId: number | string, content: string) =>
  post<WebResp>('/community/wiki/backup', { pid: pageId, content })

export const fetchWikiCategory = (cateId: number | string) =>
  get<WebResp>('/community/wiki/category', { cid: cateId })

export const deleteWikiCategory = (cateId: number | string) =>
  post<WebResp>('/community/wiki/category/delete', { cid: cateId })

export const mergeWikiCategory = (from: number | string, to: number | string) =>
  post<WebResp>('/community/wiki/category/merge', { from, to })

export const fetchWikiTmplPage = (name: string) =>
  get<WebResp>('/community/wiki/template', { name })

export const saveWikiTemplate = (name: string, content: string) =>
  post<WebResp>('/community/wiki/template/save', { name, content })

export const operateWikiPage = (action: string, payload: Params) =>
  post<WebResp>('/community/wiki/page/operate', { action, ...payload })

export const fetchChartDownload = (pageId: number | string) =>
  get<WebResp>('/community/wiki/download', { pid: pageId })

export const fetchChartFilter = (params: Params) =>
  get<WebResp>('/community/chart/filter', params)

export const fetchUserPageWiki = (userId: number | string) =>
  get<WebResp>('/community/wiki/userpage', { touid: userId })

export const saveUserPageWiki = (userId: number | string, content: string) =>
  post<WebResp>('/community/wiki/userpage', { uid: userId, content })

export const fetchSongPage = (pageId: number | string) =>
  get<WebResp>('/community/song/page', { pid: pageId })

export const fetchChartPage = (pageId: number | string) =>
  get<WebResp>('/community/chart/page', { pid: pageId })

export const fetchWikiPage = (pageId: number | string, lang?: string) =>
  get<WebResp>('/community/wiki/page', { pid: pageId, lang })
