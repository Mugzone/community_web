/** 老站 URL 常量。v3 保持路径不变，外链与书签继续可用。 */
export const URLS = {
  intro: '/',
  index: '/index',
  talk: '/talk/group',
  store: '/store/all',
  skin: '/store/skin',
  chart: '/page/all/chart',
  player: '/page/all/player',
  register: '/accounts/register',
  login: '/accounts/login',
  logout: '/accounts/logout',
  forget: '/accounts/forget',
  changeEmail: '/accounts/change_email',
  configProfile: '/accounts/config/profile',
  friend: '/accounts/friend',
  limit: '/accounts/limit',
  invite: '/accounts/invite',
  publish: '/accounts/publish',
  notify: '/talk/user/notify',
  talkUser: '/talk/user',
  search: '/page/search',
  create: '/page/create',
  latest: '/page/latest',
  allCate: '/page/all/cate',
  allPage: '/page/all',
  allQuest: '/page/all/quest',
  allDaily: '/page/all/daily',
  change: '/page/change',
  wikiAbout: '/wiki/729',
  wikiLearnMore: '/wiki/2147',
  user: (id: number | string) => `/accounts/user/${id}`,
  wiki: (id: number | string) => `/wiki/${id}`,
  song: (id: number | string) => `/song/${id}`,
  chartPage: (id: number | string) => `/chart/${id}`,
  score: (id: number | string) => `/score/${id}`,
  cate: (id: number | string) => `/page/cate/${id}`,
  chartDownload: (id: number | string) => `/page/download/${id}`,
  skinDetail: (id: number | string) => `/store/skin/detail/${id}`,
  userpageEdit: (id: number | string) => `/page/userpage/edit/${id}`,
} as const

/** 老站静态资源路径（原样拷贝 web/static 到 public/static） */
export const staticUrl = (p: string) => `/static/${p.replace(/^\//, '')}`

import { buildUrl } from '../network/api'

/** 老站 window.malody.urls：搬迁过来的页面逻辑仍可能读取 */
declare global {
  interface Window {
    malody: {
      urls?: Record<string, string>
      [key: string]: unknown
    }
  }
}

export function installWindowUrls() {
  window.malody = window.malody || {}
  window.malody.urls = {
    index: URLS.index,
    search: URLS.search,
    skinJson: buildUrl('/store/skin/list'),
    skinSubmit: buildUrl('/store/skin/submit'),
    skinStatus: buildUrl('/store/skin/status'),
    skinRemovePreview: buildUrl('/store/skin/preview/delete'),
    skinPurchase: buildUrl('/store/skin/purchase'),
    chartFilter: buildUrl('/community/chart/filter'),
    wikiOperate: buildUrl('/community/wiki/page/operate'),
    wikiBackup: buildUrl('/community/wiki/backup'),
    talkSave: buildUrl('/plugin/talk/save'),
    talkList: buildUrl('/plugin/talk/list'),
    talkOper: buildUrl('/plugin/talk/oper'),
    talkItemRaw: buildUrl('/plugin/talk/item'),
    vote: buildUrl('/plugin/vote'),
  }
}
