import type { RouteDef } from './types'
import Error403 from '../pages/errors/Error403'
import Error404 from '../pages/errors/Error404'
import Error500 from '../pages/errors/Error500'
import DDoS from '../pages/errors/DDoS'
import Abandoned, { LegacyRedirect } from '../pages/errors/Abandoned'

export const errorRoutes: RouteDef[] = [
  { path: '/403', component: Error403 },
  { path: '/404', component: Error404 },
  { path: '/500', component: Error500 },
  { path: '/ddos', component: DDoS },
]

export const abandonedRoutes: RouteDef[] = [
  { path: '/wiki/get_lang', component: Abandoned },
  { path: '/store/*', component: Abandoned },
  { path: '/talk/group', component: LegacyRedirect },
  { path: '/talk/group/:id', component: Abandoned },
  { path: '/talk/topic/:id', component: Abandoned },
  { path: '/talk/create', component: Abandoned },
  { path: '/accounts/config', component: Abandoned },
  { path: '/page/create_charts', component: Abandoned },
  { path: '/store/skin/detail', component: Abandoned },
  { path: '/captcha/*', component: Abandoned },
  { path: '/plugin/*', component: Abandoned },
  { path: '/cgi/*', component: Abandoned },
  { path: '/lolicon/*', component: Abandoned },
  { path: '/sistercon/*', component: Abandoned },
  { path: '/i18n/*', component: Abandoned },
  { path: '/git-update/', component: Abandoned },
  { path: '/git-docker/', component: Abandoned },
  { path: '/upload/*', component: Abandoned },
  { path: '/accounts/*', component: Abandoned },
  { path: '/page/*', component: Abandoned },
  { path: '*', component: Error404 },
]
