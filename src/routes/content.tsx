import type { RouteDef } from './types'
import { PageRedirect } from './internal'
import Intro from '../pages/home/Intro'
import Index from '../pages/home/Index'
import WikiPage from '../pages/wiki/WikiPage'
import SongPage from '../pages/wiki/SongPage'
import ChartPage from '../pages/wiki/ChartPage'
import WikiEdit from '../pages/wiki/WikiEdit'
import WikiMeta from '../pages/wiki/WikiMeta'
import WikiSearch from '../pages/wiki/WikiSearch'
import WikiCreate from '../pages/wiki/WikiCreate'
import UserpageEdit from '../pages/wiki/UserpageEdit'
import WikiChange from '../pages/wiki/WikiChange'
import WikiCate from '../pages/wiki/WikiCate'
import WikiLatest from '../pages/wiki/WikiLatest'
import AllChart from '../pages/wiki/AllChart'
import AllPlayer from '../pages/wiki/AllPlayer'
import AllCate from '../pages/wiki/AllCate'
import AllQuest from '../pages/wiki/AllQuest'
import AllDaily from '../pages/wiki/AllDaily'
import AllPage from '../pages/wiki/AllPage'
import SpecialList from '../pages/wiki/SpecialList'
import TmplEdit from '../pages/wiki/TmplEdit'
import TmplPage from '../pages/wiki/TmplPage'
import ChartDownload from '../pages/wiki/ChartDownload'
import Visit from '../pages/wiki/Visit'
import TalkUser from '../pages/talk/TalkUser'
import Notify from '../pages/talk/Notify'
import UserMsg from '../pages/talk/UserMsg'
import ChartTalk from '../pages/talk/ChartTalk'

export const homeRoutes: RouteDef[] = [
  { path: '/', component: Intro },
  { path: '/index', component: Index },
]

export const wikiRoutes: RouteDef[] = [
  { path: '/wiki/:id', component: WikiPage },
  { path: '/visit/:key', component: Visit },
  { path: '/song/:id', component: SongPage },
  { path: '/chart/:id', component: ChartPage },
  { path: '/wiki/edit', component: WikiEdit },
  { path: '/wiki/meta', component: WikiMeta },
]

export const wikiPageRoutes: RouteDef[] = [
  { path: '/page/search', component: WikiSearch },
  { path: '/page/create', component: WikiCreate },
  { path: '/page/userpage/edit/:id', component: UserpageEdit },
  { path: '/page/change', component: WikiChange },
  { path: '/page/cate/:id', component: WikiCate },
  { path: '/page/latest', component: WikiLatest },
  { path: '/page/all/chart', component: AllChart },
  { path: '/page/all/player', component: AllPlayer },
  { path: '/page/all/cate', component: AllCate },
  { path: '/page/all/quest', component: AllQuest },
  { path: '/page/all/daily', component: AllDaily },
  { path: '/page/all', component: AllPage },
  { path: '/page/special/:name', component: SpecialList },
  { path: '/page/tmpl/edit', component: TmplEdit },
  { path: '/page/tmpl/:name', component: TmplPage },
  { path: '/page/download/:id', component: ChartDownload },
  { path: '/page/:pageId', component: PageRedirect },
]

export const talkRoutes: RouteDef[] = [
  { path: '/talk/user', component: TalkUser },
  { path: '/talk/user/notify', component: Notify },
  { path: '/talk/user/:host/:guest', component: UserMsg },
  { path: '/talk/chart', component: ChartTalk },
]
