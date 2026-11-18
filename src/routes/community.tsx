import type { RouteDef } from './types'
import { EventRoute } from './internal'
import ScorePage from '../pages/score/ScorePage'
import EventPage from '../pages/score/EventPage'
import EventRank from '../pages/score/EventRank'
import EventEdit from '../pages/score/EventEdit'
import StoreAll from '../pages/store/StoreAll'
import MyItems from '../pages/store/MyItems'
import SkinList from '../pages/store/SkinList'
import SkinEntry from '../pages/store/SkinEntry'
import SkinDetail from '../pages/store/SkinDetail'
import SubmitAll from '../pages/store/SubmitAll'
import Command from '../pages/admin/Command'
import SkinHash from '../pages/admin/SkinHash'
import Running from '../pages/admin/Running'

export const scoreRoutes: RouteDef[] = [
  { path: '/score/event/edit', component: EventEdit },
  { path: '/score/event', component: EventRoute },
  { path: '/score/event/:id', component: EventPage },
  { path: '/score/event_rank/:id', component: EventRank },
  { path: '/score/:chartId', component: ScorePage },
]

export const storeRoutes: RouteDef[] = [
  { path: '/store/all', component: StoreAll },
  { path: '/store/my', component: MyItems },
  { path: '/store/skin', component: SkinList },
  { path: '/store/skin/entry', component: SkinEntry },
  { path: '/store/skin/detail/:sid', component: SkinDetail },
  { path: '/submit/all', component: SubmitAll },
]

export const adminRoutes: RouteDef[] = [
  { path: '/emiri/command', component: Command },
  { path: '/emiri/skinhash', component: SkinHash },
  { path: '/emiri/running', component: Running },
]
