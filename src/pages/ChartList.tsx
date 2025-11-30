import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AuthModal from '../components/AuthModal'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'
import { fetchStoreList, setSession } from '../network/api'
import type { RespStoreListItem } from '../network/api'
import { coverUrl, modeLabelsFromMask } from '../utils/formatters'
import { useI18n } from '../i18n'
import './home.css'
import './chart-list.css'

type FilterState = {
  mode: number
  keyword: string
  free: boolean
  beta: boolean
  levelMin: string
  levelMax: string
}

type ChartCardItem = RespStoreListItem & {
  cover: string
  modeLabels: string[]
}

const parseInitialFilters = (): FilterState => {
  const search = new URLSearchParams(window.location.search)
  const modeRaw = search.get('mode')
  const modeParam = modeRaw === null ? Number.NaN : Number(modeRaw)
  const freeParam = search.get('free')
  const betaParam = search.get('beta')
  const lvge = search.get('lvge')
  const lvle = search.get('lvle')
  return {
    mode: Number.isFinite(modeParam) ? modeParam : -1,
    keyword: search.get('word') ?? '',
    free: freeParam === '1',
    beta: betaParam === '1',
    levelMin: lvge ?? '',
    levelMax: lvle ?? '',
  }
}

function ChartListPage() {
  const { t } = useI18n()
  const initialFilters = useMemo(() => parseInitialFilters(), [])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [charts, setCharts] = useState<ChartCardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [next, setNext] = useState<number | undefined>()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [userName, setUserName] = useState<string>()

  const modeOptions = useMemo(
    () => [
      { value: -1, label: t('charts.mode.all') },
      { value: 0, label: t('mode.key') },
      { value: 3, label: t('mode.catch') },
      { value: 4, label: t('mode.pad') },
      { value: 5, label: t('mode.taiko') },
      { value: 6, label: t('mode.ring') },
      { value: 7, label: t('mode.slide') },
      { value: 8, label: t('mode.live') },
      { value: 9, label: t('mode.cube') },
    ],
    [t],
  )

  const buildParams = (current: FilterState, from: number) => {
    const lvgeNum = Number(current.levelMin)
    const lvleNum = Number(current.levelMax)
    const params: {
      mode?: number
      beta?: number
      from?: number
      free?: number
      word?: string
      lvge?: number
      lvle?: number
    } = {
      mode: current.mode,
      beta: current.beta ? 1 : 0,
      free: current.free ? 1 : 0,
      from,
    }
    if (current.keyword.trim()) {
      params.word = current.keyword.trim()
    }
    if (!Number.isNaN(lvgeNum) && current.levelMin !== '') {
      params.lvge = lvgeNum
    }
    if (!Number.isNaN(lvleNum) && current.levelMax !== '') {
      params.lvle = lvleNum
    }
    return params
  }

  const mapToCard = (items: RespStoreListItem[]) =>
    items.map((item) => ({
      ...item,
      cover: coverUrl(item.cover),
      modeLabels: modeLabelsFromMask(item.mode),
    }))

  const formatLength = (value?: number) => {
    if (!value || Number.isNaN(value)) return t('charts.card.lengthUnknown')
    const minutes = Math.floor(value / 60)
    const seconds = Math.max(0, value - minutes * 60)
    const time = `${minutes}:${String(seconds).padStart(2, '0')}`
    return t('charts.card.length', { value: time })
  }

  const formatBpm = (value?: number) => {
    if (!value || Number.isNaN(value)) return t('charts.card.bpmUnknown')
    return t('charts.card.bpm', { value })
  }

  const formatUpdated = (value?: number) => {
    if (!value) return t('charts.card.updatedUnknown')
    const date = new Date(value * 1000)
    if (Number.isNaN(date.getTime())) return t('charts.card.updatedUnknown')
    return t('charts.card.updated', { time: date.toLocaleDateString() })
  }

  const loadCharts = async (reset = false, activeFilters?: FilterState) => {
    if (loading) return
    const currentFilters = activeFilters ?? filters
    setLoading(true)
    setError('')
    try {
      const from = reset ? 0 : next ?? 0
      const resp = await fetchStoreList(buildParams(currentFilters, from), { clientVersion: '6.3.22' })
      if (resp.code !== 0 || !resp.data) {
        setError(t('charts.error.fetch'))
        if (reset) setCharts([])
        setHasMore(false)
        setNext(undefined)
        return
      }
      const mapped = mapToCard(resp.data)
      setCharts((prev) => (reset ? mapped : [...prev, ...mapped]))
      setHasMore(Boolean(resp.hasMore))
      setNext(resp.next)
    } catch (err) {
      console.error(err)
      setError(t('charts.error.network'))
      if (reset) setCharts([])
      setHasMore(false)
      setNext(undefined)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitFilters = (e: FormEvent) => {
    e.preventDefault()
    loadCharts(true)
  }

  const resetFilters = () => {
    const reset = { ...initialFilters }
    setFilters(reset)
    loadCharts(true, reset)
  }

  useEffect(() => {
    loadCharts(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <section className="chart-hero">
        <div>
          <p className="eyebrow">{t('charts.eyebrow')}</p>
          <h1>{t('charts.title')}</h1>
          <p>{t('charts.desc')}</p>
        </div>
        <div className="chart-hero-card">
          <p className="eyebrow">{t('charts.filter.title')}</p>
          <form className="chart-filters" onSubmit={onSubmitFilters}>
            <label className="chart-field">
              <span>{t('charts.filter.keyword')}</span>
              <input
                type="search"
                value={filters.keyword}
                placeholder={t('charts.filter.keywordPlaceholder')}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              />
            </label>
            <label className="chart-field">
              <span>{t('charts.filter.mode')}</span>
              <select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: Number(e.target.value) })}>
                {modeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="chart-field range">
              <span>{t('charts.filter.level')}</span>
              <div className="level-range">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={filters.levelMin}
                  placeholder={t('charts.filter.levelMin')}
                  onChange={(e) => setFilters({ ...filters, levelMin: e.target.value })}
                />
                <span className="range-sep">—</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={filters.levelMax}
                  placeholder={t('charts.filter.levelMax')}
                  onChange={(e) => setFilters({ ...filters, levelMax: e.target.value })}
                />
              </div>
            </div>
            <label className="chart-checkbox">
              <input
                type="checkbox"
                checked={filters.free}
                onChange={(e) => setFilters({ ...filters, free: e.target.checked })}
              />
              <span>{t('charts.filter.free')}</span>
            </label>
            <label className="chart-checkbox">
              <input
                type="checkbox"
                checked={filters.beta}
                onChange={(e) => setFilters({ ...filters, beta: e.target.checked })}
              />
              <span>{t('charts.filter.beta')}</span>
            </label>
            <div className="chart-actions-row">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? t('charts.loading') : t('charts.filter.apply')}
              </button>
              <button className="btn ghost" type="button" onClick={resetFilters} disabled={loading}>
                {t('charts.filter.reset')}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t('charts.listTitle')}</h2>
          <span className="chart-count">
            {error ? error : t('charts.results.count', { count: charts.length })}
          </span>
        </div>
        {charts.length ? (
          <div className="chart-grid">
            {charts.map((item) => (
              <a className="chart-card" href={`/song/${item.sid}`} key={item.sid}>
                <div className="chart-card-cover" style={{ backgroundImage: `url(${item.cover})` }}>
                  <div className="chart-card-badges">
                    {item.modeLabels.slice(0, 3).map((label) => (
                      <span className="pill chart-mode-pill" key={label}>
                        {label}
                      </span>
                    ))}
                    {filters.free && <span className="pill ghost">{t('charts.badge.freestyle')}</span>}
                    {filters.beta && <span className="pill ghost">{t('charts.badge.beta')}</span>}
                  </div>
                </div>
                <div className="chart-card-body">
                  <div className="chart-card-header">
                    <div>
                      <p className="chart-card-title">{item.title}</p>
                      <p className="chart-card-artist">{item.artist}</p>
                    </div>
                  </div>
                  <div className="chart-card-meta">
                    <span className="meta-pill">{formatLength(item.length)}</span>
                    <span className="meta-pill">{formatBpm(item.bpm)}</span>
                  </div>
                  <div className="chart-card-footer">
                    <span className="chart-card-updated">{formatUpdated(item.lastedit)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="chart-empty">
            {error ? error : loading ? t('charts.loading') : t('charts.results.empty')}
          </div>
        )}
        <div className="chart-actions">
          {hasMore && (
            <button className="load-more" type="button" onClick={() => loadCharts()} disabled={loading}>
              {loading ? t('charts.loading') : t('charts.loadMore')}
            </button>
          )}
        </div>
      </section>

      <Footer
        links={[
          { label: 'Discord', href: 'https://discord.gg/unk9hgF' },
          { label: 'Facebook', href: 'https://www.facebook.com/MalodyHome' },
          { label: 'Sina', href: 'http://weibo.com/u/5351167572' },
        ]}
        showLanguageSelector
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

export default ChartListPage
