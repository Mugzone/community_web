import HomePage from './pages/Home'
import PlayerRankPage from './pages/PlayerRank'
import ChartListPage from './pages/ChartList'
import EventListPage from './pages/EventList'
import EventDetailPage from './pages/EventDetail'
import EventEditPage from './pages/EventEdit'
import SkinListPage from './pages/SkinList'
import SkinDetailPage from './pages/SkinDetail'
import WikiPage from './pages/Wiki'
import WikiCreatePage from './pages/WikiCreate'
import SongPage from './pages/Song'
import SongEditPage from './pages/SongEdit'
import ChartPage from './pages/Chart'
import ChartEditPage from './pages/ChartEdit'
import PlayerPage from './pages/Player'
import PlayerEditPage from './pages/PlayerEdit'
import ActivationCodePage from './pages/ActivationCode'
import SearchPage from './pages/Search'

const isPlayerRankPath = (path: string) => {
  return (
    path.startsWith('/page/all/player') ||
    path === '/all_player' ||
    path === '/page/all/player/'
  )
}

const isChartListPath = (path: string) => {
  return path.startsWith('/page/all/chart') || path.startsWith('/all_chart')
}

const isEventPath = (path: string) => {
  return path.startsWith('/score/event')
}

const isEventEditPath = (path: string) => {
  return path.startsWith('/score/event/edit')
}

const hasEventId = () => {
  const search = new URLSearchParams(window.location.search)
  const eid = search.get('eid') ?? search.get('id')
  return eid !== null && eid !== ''
}

const isSkinDetailPath = (path: string) =>
  path.startsWith('/store/skin/detail') || path.startsWith('/skin/')

const isSkinListPath = (path: string) =>
  path.startsWith('/store/skin') && !path.startsWith('/store/skin/detail')

const isWikiPath = (path: string) => {
  return path.startsWith('/wiki/')
}

const isWikiCreatePath = (path: string) => {
  return path === '/wiki/create' || path === '/wiki/create/'
}

const isSongPath = (path: string) => {
  return path.startsWith('/song/')
}

const isSongEditPath = (path: string) => {
  return path.startsWith('/song/') && path.includes('/edit')
}

const isChartEditPath = (path: string) => {
  return path.startsWith('/chart/') && path.includes('/edit')
}

const isChartPath = (path: string) => {
  return path.startsWith('/chart/')
}

const isPlayerPath = (path: string) => {
  return path.startsWith('/player/') || path.startsWith('/accounts/user/')
}

const isPlayerEditPath = (path: string) => {
  return (
    path.startsWith('/accounts/config/profile') ||
    path.startsWith('/account/config/profile')
  )
}

const isActivationCodePath = (path: string) => {
  return path === '/code' || path === '/code/'
}

const isSearchPath = (path: string) => {
  return path.startsWith('/search')
}

function App() {
  const path = window.location.pathname
  if (isPlayerEditPath(path)) {
    return <PlayerEditPage />
  }
  if (isActivationCodePath(path)) {
    return <ActivationCodePage />
  }
  if (isSearchPath(path)) {
    return <SearchPage />
  }
  if (isPlayerPath(path)) {
    return <PlayerPage />
  }
  if (isSongEditPath(path)) {
    return <SongEditPage />
  }
  if (isChartEditPath(path)) {
    return <ChartEditPage />
  }
  if (isChartPath(path)) {
    return <ChartPage />
  }
  if (isSongPath(path)) {
    return <SongPage />
  }
  if (isWikiCreatePath(path)) {
    return <WikiCreatePage />
  }
  if (isWikiPath(path)) {
    return <WikiPage />
  }
  if (isSkinDetailPath(path)) {
    return <SkinDetailPage />
  }
  if (isSkinListPath(path)) {
    return <SkinListPage />
  }
  if (isEventEditPath(path)) {
    return <EventEditPage />
  }
  if (isEventPath(path)) {
    return hasEventId() ? <EventDetailPage /> : <EventListPage />
  }
  if (isChartListPath(path)) {
    return <ChartListPage />
  }
  if (isPlayerRankPath(path)) {
    return <PlayerRankPage />
  }
  return <HomePage />
}

export default App
