import { get, post, type WebResp, type Params } from './pageBase'

export const fetchScorePage = (chartId: number | string, page = 1, from?: number | string) =>
  get<WebResp>('/score/chart', { cid: chartId, page, from })

export const operateScore = (payload: Params) => post<WebResp>('/score/operation', payload)

export const fetchEventPage = (eventId: number | string) =>
  get<WebResp>('/score/event', { eid: eventId })

export const fetchEventRank = (eventId: number | string, page = 1) =>
  get<WebResp>('/score/event/rank', { eid: eventId, page })

export const fetchMyItems = () => get<WebResp>('/store/items')

export const useStoreItem = (id: number | string) => post<WebResp>('/store/use', { id })

export const buyStoreItem = (id: number | string) => post<WebResp>('/store/buy', { id })

export const submitSkin = (payload: Params) => post<WebResp>('/store/skin/submit', payload)

export const setSkinStatus = (payload: Params) => post<WebResp>('/store/skin/status', payload)

export const deleteSkin = (sid: number | string) => post<WebResp>('/store/skin/delete', { sid })

export const removeSkinPreview = (payload: Params) =>
  post<WebResp>('/store/skin/preview/delete', payload)

export const purchaseSkin = (sid: number | string) =>
  post<WebResp>('/store/skin/purchase', { sid })

export const fetchSkinList = (params: Params) => get<WebResp>('/store/skin/list', params)

export const fetchSkinDetail = (sid: number | string) => get<WebResp>('/store/skin/detail', { sid })

export const fetchUploadSign = (params: Params) => get<WebResp>('/upload/sign', params)

export const fetchUploadPage = (type: string) => get<WebResp>('/upload/page', { type })

export const deleteBanner = () => post<WebResp>('/upload/banner/delete')

export const fetchSubmissionPage = (page = 1) => get<WebResp>('/submission/page', { page })
