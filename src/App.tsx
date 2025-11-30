import HomePage from './pages/Home'
import PlayerRankPage from './pages/PlayerRank'
import ChartListPage from './pages/ChartList'
import EventListPage from './pages/EventList'
import SkinListPage from './pages/SkinList'
import WikiPage from './pages/Wiki'
import SongPage from './pages/Song'
import ChartPage from './pages/Chart'

const isPlayerRankPath = (path: string) => {
  return path.startsWith('/page/all/player') || path === '/all_player' || path === '/page/all/player/'
}

const isChartListPath = (path: string) => {
  return path.startsWith('/page/all/chart') || path.startsWith('/all_chart')
}

const isEventPath = (path: string) => {
  return path.startsWith('/score/event')
}

const isSkinPath = (path: string) => {
  return path.startsWith('/store/skin')
}

const isWikiPath = (path: string) => {
  return path.startsWith('/wiki/')
}

const isSongPath = (path: string) => {
  return path.startsWith('/song/')
}

const isChartPath = (path: string) => {
  return path.startsWith('/chart/')
}

function App() {
  const path = window.location.pathname
  if (isChartPath(path)) {
    return <ChartPage />
  }
  if (isSongPath(path)) {
    return <SongPage />
  }
  if (isWikiPath(path)) {
    return <WikiPage />
  }
  if (isSkinPath(path)) {
    return <SkinListPage />
  }
  if (isEventPath(path)) {
    return <EventListPage />
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
