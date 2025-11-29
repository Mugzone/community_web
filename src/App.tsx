import HomePage from './pages/Home'
import PlayerRankPage from './pages/PlayerRank'

const isPlayerRankPath = (path: string) => {
  return path.startsWith('/page/all/player') || path === '/all_player' || path === '/page/all/player/'
}

function App() {
  const path = window.location.pathname
  if (isPlayerRankPath(path)) {
    return <PlayerRankPage />
  }
  return <HomePage />
}

export default App
