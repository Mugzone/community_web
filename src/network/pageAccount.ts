import { get, post, type WebResp, type Params } from './pageBase'

export const saveTalk = (payload: Params) => post<WebResp>('/plugin/talk/save', payload)

export const fetchTalkList = (params: Params) => get<WebResp>('/plugin/talk/list', params)

export const operateTalk = (payload: Params) => post<WebResp>('/plugin/talk/oper', payload)

export const fetchTalkRaw = (id: number | string) => get<WebResp>('/plugin/talk/item', { id })

export const submitVote = (payload: Params) => post<WebResp>('/plugin/vote', payload)

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

export const activateAccount = (key: string) => get<WebResp>('/account/activate/wt', { key }, false)

export const confirmEmail = (key: string) => get<WebResp>('/account/email/confirm/wt', { key }, false)

export const fetchTalkInbox = (page = 1) => get<WebResp>('/talk/user', { page })

export const fetchTalkNotify = (page = 1) => get<WebResp>('/talk/notify', { page })

export const fetchTalkMessage = (host: number | string, guest: number | string) =>
  get<WebResp>('/talk/message', { host, guest })

export const fetchChartTalk = (cid: number | string) => get<WebResp>('/talk/chart', { cid })
