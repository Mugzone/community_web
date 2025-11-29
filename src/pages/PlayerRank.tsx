import { useEffect, useState } from 'react'
import AuthModal from '../components/AuthModal'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'
import { fetchGlobalRank, setSession } from '../network/api'
import type { RespGlobalRankItem } from '../network/api'
import { avatarUrl } from '../utils/formatters'
import './home.css'
import './player-rank.css'

type RankType = 'exp' | 'mm'

const modes = [
  { label: 'Key', value: 0 },
  // { label: 'Step', value: 1 },
  { label: 'Catch', value: 3 },
  { label: 'Taiko', value: 4 },
  { label: 'Pad', value: 5 },
  { label: 'Ring', value: 6 },
  { label: 'Slide', value: 7 },
  { label: 'Live', value: 8 },
  { label: 'Cube', value: 9 },
]

function PlayerRankPage() {
  const [rankType, setRankType] = useState<RankType>('exp')
  const [mode, setMode] = useState(0)
  const [rows, setRows] = useState<RespGlobalRankItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [next, setNext] = useState<number | undefined>()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [userName, setUserName] = useState<string>()

  const formatAcc = (acc?: number) => {
    if (acc === undefined || Number.isNaN(acc)) return '-'
    return `${acc.toFixed(2)}%`
  }

  const loadRank = async (reset = false) => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const from = reset ? 0 : next ?? 0
      const resp = await fetchGlobalRank({ mm: rankType === 'mm' ? 1 : 0, mode, from, ver: 0 })
      if (resp.code !== 0 || !resp.data) {
        setError('无法获取排行榜，请稍后重试')
        setRows(reset ? [] : rows)
        setHasMore(false)
        setNext(undefined)
        return
      }
      setRows(reset ? resp.data : [...rows, ...resp.data])
      setHasMore(Boolean(resp.hasMore))
      setNext(resp.next)
    } catch (err) {
      console.error(err)
      setError('无法获取排行榜，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRank(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankType, mode])

  return (
    <div className="page">
      <Topbar
        onSignIn={() => {
          setAuthMode('signin')
          setAuthOpen(true)
        }}
        onSignUp={() => {
          setAuthMode('signup')
          setAuthOpen(true)
        }}
        onSignOut={() => {
          setSession(undefined)
          setUserName(undefined)
        }}
        userName={userName}
      />

      <section className="rank-hero">
        <div>
          <p className="eyebrow">Players</p>
          <h1>Global Leaderboard</h1>
          <p>Experience and MM rankings by mode. Browse without login; sign in to save favorites later.</p>
          <div className="filters">
            <div className="pill-group">
              <button
                className={`pill-toggle ${rankType === 'exp' ? 'active' : ''}`}
                type="button"
                onClick={() => setRankType('exp')}
              >
                EXP
              </button>
              <button
                className={`pill-toggle ${rankType === 'mm' ? 'active' : ''}`}
                type="button"
                onClick={() => setRankType('mm')}
              >
                MM
              </button>
            </div>
            <select
              className="mode-select"
              value={mode}
              onChange={(e) => setMode(Number(e.target.value))}
              aria-label="Select mode"
            >
              {modes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">About</p>
          <p>
            Data comes from `/ranking/global`. EXP ranks use mode experience; MM ranks use grade score. List is capped at
            200 entries.
          </p>
        </div>
      </section>

      <div className="rank-table-wrap">
        <table className="rank-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>{rankType === 'mm' ? 'MM Score' : 'EXP'}</th>
              <th>Stats</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.uid}`}>
                <td>{row.rank}</td>
                <td className="player-cell">
                  <img className="rank-avatar" src={avatarUrl(row.avatar)} alt={row.username ?? 'Player'} />
                  <a className="rank-name" href={`/player/${row.uid}`}>
                    {row.username || `Player ${row.uid}`}
                  </a>
                </td>
                <td className="rank-value">{row.value}</td>
                <td>
                  <div className="rank-meta">
                    <span>Lv.{row.level ?? '-'}</span>
                    <span>Play {row.playcount ?? '-'}</span>
                    <span>Acc {formatAcc(row.acc)}</span>
                    <span>Combo {row.combo ?? '-'}</span>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={4} className="empty">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="table-actions">
          <span>{error ? error : `Showing ${rows.length} players`}</span>
          {hasMore && (
            <button className="load-more" onClick={() => loadRank()} disabled={loading}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      </div>

      <Footer
        links={[
          { label: 'Discord', href: 'https://discord.gg/unk9hgF' },
          { label: 'Facebook', href: 'https://www.facebook.com/MalodyHome' },
          { label: 'Sina', href: 'http://weibo.com/u/5351167572' },
        ]}
      />

      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={({ username }) => setUserName(username)}
        />
      )}
    </div>
  )
}

export default PlayerRankPage
