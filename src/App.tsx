import HomePage from './pages/Home'
import PlayerRankPage from './pages/PlayerRank'
import ChartListPage from './pages/ChartList'

const isPlayerRankPath = (path: string) => {
  return path.startsWith('/page/all/player') || path === '/all_player' || path === '/page/all/player/'
}

const isChartListPath = (path: string) => {
  return path.startsWith('/page/all/chart') || path.startsWith('/all_chart')
}

function App() {
  const path = window.location.pathname
  if (isChartListPath(path)) {
    return <ChartListPage />
  }
  if (isPlayerRankPath(path)) {
    return <PlayerRankPage />
  }
  return <HomePage />
}

export default App
