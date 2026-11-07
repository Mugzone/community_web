/**
 * 老站网页层接口契约。
 *
 * 凡 MaApi-go 已有 /api 接口（community/wiki、ranking、store、skin、comment、
 * player、event 等组）可直接复用 src/network/api.ts 中的既有函数，本文件只收录
 * 老站页面专用、需要 MaApi-go 在对应路由分组里补齐的接口。
 *
 * 命名与老站 URL 一一对应，便于逐页搬迁时核对：
 *   /page/*        -> /api/community/wiki/*、/api/web/*
 *   /plugin/*      -> /api/plugin/*
 *   /accounts/*    -> /api/account/*
 *   /talk/*        -> /api/talk/*
 *   /score/*       -> /api/score/*
 *   /store/*       -> /api/store/*、/api/skin/*
 *   /upload/*      -> /api/upload/*
 */
import { getJson, postForm } from './api'

export type WebResp<T = any> = {
  code: number
  data?: T
  message?: string
  [key: string]: any
}

type Params = Record<string, string | number | undefined>

const get = <T = any>(path: string, params?: Params, auth = true): Promise<T> =>
  getJson<T>(path, { params, auth })

const post = <T = any>(path: string, body?: Params, params?: Params, auth = true): Promise<T> =>
  postForm<T>(path, { body, params, auth })

/* ------------------------------------------------------------------ *
 * /api/web — 站点级页面数据
 * ------------------------------------------------------------------ */

/** 首页 /index：banner、统计、News、New Arrival、Weekly Show */
export const fetchHomeData = () => get<WebResp>('/web/home/wt', undefined, false)
/** 落地页 /：产品介绍内容 */
export const fetchIntroData = () => get<WebResp>('/web/intro/wt', undefined, false)
/** The Jail 封禁公示 /accounts/limit */
export const fetchLimitList = (page = 1) => get<WebResp>('/web/limit/wt', { page }, false)
/** 任务列表 /page/all/quest */
export const fetchQuestList = () => get<WebResp>('/web/quest/wt', undefined, false)
/** 每日谱面 /page/all/daily */
export const fetchDailyList = () => get<WebResp>('/web/daily/wt', undefined, false)
/** 特殊列表 /page/special/<name> */
export const fetchSpecialList = (name: string, page?: number, type?: string) => get<WebResp>('/web/special/wt', { name, page, type }, false)
/** 全部 wiki 页面 /page/all */
export const fetchAllPages = (page = 1, type?: 'wiki' | 'song') => get<WebResp>('/web/all/wt', { page, type }, false)
/** 多语言内容切换（老站 /wiki/get_lang） */
export const fetchWikiLang = (key: string, lang: string) =>
  get<WebResp>('/web/lang/wt', { key, lang }, false)
/** 验证码（老站 /captcha/*） */
export const fetchCaptcha = (key?: string) => get<WebResp>('/web/captcha/wt', { key }, false)

/* ------------------------------------------------------------------ *
 * /api/community — wiki 与谱面网页层
 * ------------------------------------------------------------------ */

export const fetchWikiSearch = (keyword: string, type?: string) =>
  get<WebResp>('/community/wiki/search', { keyword, type, web: 1 })
export const fetchWikiPreview = (text: string) =>
  post<WebResp>('/community/wiki/preview', { text })
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
  get<WebResp>('/community/wiki/userpage', { uid: userId })
export const saveUserPageWiki = (userId: number | string, content: string) =>
  post<WebResp>('/community/wiki/userpage', { uid: userId, content })
export const fetchSongPage = (pageId: number | string) =>
  get<WebResp>('/community/song/page', { pid: pageId })
export const fetchChartPage = (pageId: number | string) =>
  get<WebResp>('/community/chart/page', { pid: pageId })
export const fetchWikiPage = (pageId: number | string, lang?: string) =>
  get<WebResp>('/community/wiki/page', { pid: pageId, lang })

/* ------------------------------------------------------------------ *
 * /api/plugin — 讨论 / 评论 / 投票组件
 * ------------------------------------------------------------------ */

export const saveTalk = (payload: Params) => post<WebResp>('/plugin/talk/save', payload)
export const fetchTalkList = (params: Params) => get<WebResp>('/plugin/talk/list', params)
export const operateTalk = (payload: Params) => post<WebResp>('/plugin/talk/oper', payload)
export const fetchTalkRaw = (id: number | string) => get<WebResp>('/plugin/talk/item', { id })
export const submitVote = (payload: Params) => post<WebResp>('/plugin/vote', payload)

/* ------------------------------------------------------------------ *
 * /api/account — 网页账号功能
 * ------------------------------------------------------------------ */

export const fetchUnreadMsg = () => get<WebResp>('/account/msg/unread')
export const deleteUserMsg = () => post<WebResp>('/account/msg/delete')
export const fetchAchieveList = (userId: number | string) =>
  get<WebResp>('/account/achieve/list', { touid: userId })
export const operateAchieve = (payload: Params) => post<WebResp>('/account/achieve/oper', payload)
export const fetchInviteInfo = () => get<WebResp>('/account/invite')
export const activateInvite = (code: string) => post<WebResp>('/account/invite/active', { code })
export const fetchPublisher = () => get<WebResp>('/account/publish')
export const operatePublisher = (payload: Params) => post<WebResp>('/account/publish/oper', payload)
export const requestPasswordReset = (email: string) =>
  post<WebResp>('/account/password/forget/wt', { email }, undefined, false)
export const resetPassword = (payload: Params) => post<WebResp>('/account/password/reset/wt', payload, undefined, false)
export const requestEmailChange = (email: string) =>
  post<WebResp>('/account/email/change', { email }, undefined, true)
// 账号流程均为未登录场景，统一用 /wt 公开路由，避免激活 key 与会话 token 的 query 同名冲突。
export const activateAccount = (key: string) => get<WebResp>('/account/activate/wt', { key }, false)
export const confirmEmail = (key: string) => get<WebResp>('/account/email/confirm/wt', { key }, false)

/* ------------------------------------------------------------------ *
 * /api/talk — 私信 / 通知 / 谱面讨论
 * ------------------------------------------------------------------ */

export const fetchTalkInbox = (page = 1) => get<WebResp>('/talk/user', { page })
export const fetchTalkNotify = (page = 1) => get<WebResp>('/talk/notify', { page })
export const fetchTalkMessage = (host: number | string, guest: number | string) =>
  get<WebResp>('/talk/message', { host, guest })
export const fetchChartTalk = (cid: number | string) => get<WebResp>('/talk/chart', { cid })

/* ------------------------------------------------------------------ *
 * /api/score — 成绩 / 活动网页层
 * ------------------------------------------------------------------ */

export const fetchScorePage = (chartId: number | string, page = 1, from?: number | string) =>
  get<WebResp>('/score/chart', { cid: chartId, page, from })
export const operateScore = (payload: Params) => post<WebResp>('/score/operation', payload)
export const fetchEventPage = (eventId: number | string) =>
  get<WebResp>('/score/event', { eid: eventId })
export const fetchEventRank = (eventId: number | string, page = 1) =>
  get<WebResp>('/score/event/rank', { eid: eventId, page })

/* ------------------------------------------------------------------ *
 * /api/store /api/skin — 商店、道具、皮肤投稿
 * ------------------------------------------------------------------ */

export const fetchMyItems = () => get<WebResp>('/store/items')
export const useStoreItem = (id: number | string) => post<WebResp>('/store/use', { id })
export const buyStoreItem = (id: number | string) => post<WebResp>('/store/buy', { id })
export const fetchPromotion = () => get<WebResp>('/store/promotion')
export const submitBid = (payload: Params) => post<WebResp>('/store/bid', payload)
export const submitSkin = (payload: Params) => post<WebResp>('/store/skin/submit', payload)
export const setSkinStatus = (payload: Params) => post<WebResp>('/store/skin/status', payload)
export const deleteSkin = (sid: number | string) => post<WebResp>('/store/skin/delete', { sid })
export const removeSkinPreview = (payload: Params) =>
  post<WebResp>('/store/skin/preview/delete', payload)
export const purchaseSkin = (sid: number | string) =>
  post<WebResp>('/store/skin/purchase', { sid })
export const fetchSkinList = (params: Params) => get<WebResp>('/store/skin/list', params)
export const fetchSkinDetail = (sid: number | string) => get<WebResp>('/store/skin/detail', { sid })

/* ------------------------------------------------------------------ *
 * /api/upload — 上传页
 * ------------------------------------------------------------------ */

export const fetchUploadSign = (params: Params) => get<WebResp>('/upload/sign', params)
export const fetchUploadPage = (type: string) => get<WebResp>('/upload/page', { type })
export const deleteBanner = () => post<WebResp>('/upload/banner/delete')

/* ------------------------------------------------------------------ *
 * /api/submission — 投稿审核队列
 * ------------------------------------------------------------------ */

export const fetchSubmissionPage = (page = 1) => get<WebResp>('/submission/page', { page })
