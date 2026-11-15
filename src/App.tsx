import { Route, Routes } from 'react-router-dom'
import type { RouteDef } from './routes/types'
import { homeRoutes, wikiRoutes, wikiPageRoutes, talkRoutes } from './routes/content'
import { accountRoutes, uploadRoutes } from './routes/account'
import { scoreRoutes, storeRoutes, adminRoutes } from './routes/community'
import { errorRoutes, abandonedRoutes } from './routes/fallback'

const routes: RouteDef[] = [
  ...homeRoutes,
  ...wikiRoutes,
  ...wikiPageRoutes,
  ...accountRoutes,
  ...talkRoutes,
  ...scoreRoutes,
  ...storeRoutes,
  ...uploadRoutes,
  ...adminRoutes,
  ...errorRoutes,
  ...abandonedRoutes,
]

export default function App() {
  return (
    <Routes>
      {routes.map(({ path, component: Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
    </Routes>
  )
}
