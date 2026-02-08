import { useEffect, useMemo, useState, type FormEvent } from 'react'
import LoadMoreButton from '../components/LoadMoreButton'
import PageLayout from '../components/PageLayout'
import { UseAuthModal } from '../components/UseAuthModal'
import { searchPlayer, searchWiki, type RespPlayerSearchItem, type RespWikiSearchItem } from '../network/api'
import { useI18n } from '../i18n'
import '../styles/search.css'

type SearchType = 'wiki' | 'player'

type SearchResult =
  | ({ kind: 'wiki' } & RespWikiSearchItem)
  | ({ kind: 'player' } & RespPlayerSearchItem)

const PAGE_SIZE = 20

const parseInitialSearch = () => {
  const search = new URLSearchParams(window.location.search)
  const keyword = search.get('keyword') ?? ''
  const typeParam = search.get('type')
  const type: SearchType = typeParam === 'player' ? 'player' : 'wiki'
  return { keyword, type }
}

function SearchPage() {
  const { t } = useI18n()
  const auth = UseAuthModal()
  const initial = useMemo(() => parseInitialSearch(), [])
  const [searchType, setSearchType] = useState<SearchType>(initial.type)
  const [keyword, setKeyword] = useState(initial.keyword)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(Boolean(initial.keyword.trim()))
  const [hasMore, setHasMore] = useState(false)
  const [next, setNext] = useState(0)
  const [activeType, setActiveType] = useState<SearchType>(initial.type)
  const [activeKeyword, setActiveKeyword] = useState(initial.keyword.trim())

  const updateUrl = (nextType: SearchType, nextKeyword: string) => {
    const params = new URLSearchParams()
    if (nextType) params.set('type', nextType)
    const value = nextKeyword.trim()
    if (value) params.set('keyword', value)
    const query = params.toString()
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`
    window.history.replaceState(null, '', nextUrl)
  }

  const loadResults = async (nextType: SearchType, nextKeyword: string, reset = false) => {
    const value = nextKeyword.trim()
    if (reset) {
      updateUrl(nextType, value)
    }
    if (!value) {
      setResults([])
      setError('')
      setHasSearched(false)
      setHasMore(false)
      setNext(0)
      return
    }
    if (reset) {
      setActiveType(nextType)
      setActiveKeyword(value)
    }
    if (loading) return
    const from = reset ? 0 : next
    setLoading(true)
    setHasSearched(true)
    setError('')
    try {
      if (nextType === 'wiki') {
        const resp = await searchWiki({ keyword: value, from, limit: PAGE_SIZE })
        if (resp.code !== 0) {
          setError(t('search.error.fetch'))
          if (reset) setResults([])
          setHasMore(false)
          if (reset) setNext(0)
          return
        }
        const mapped =
          resp.data?.map((item) => ({ ...item, kind: 'wiki' as const })) ?? []
        setResults((prev) => (reset ? mapped : [...prev, ...mapped]))
        setHasMore(Boolean(resp.hasMore))
        setNext(resp.next ?? from + mapped.length)
        return
      }
      const resp = await searchPlayer({ keyword: value, from, limit: PAGE_SIZE })
      if (resp.code !== 0) {
        setError(t('search.error.fetch'))
        if (reset) setResults([])
        setHasMore(false)
        if (reset) setNext(0)
        return
      }
      const mapped =
        resp.data?.map((item) => ({ ...item, kind: 'player' as const })) ?? []
      setResults((prev) => (reset ? mapped : [...prev, ...mapped]))
      setHasMore(Boolean(resp.hasMore))
      setNext(resp.next ?? from + mapped.length)
    } catch (err) {
      console.error(err)
      setError(t('search.error.network'))
      if (reset) setResults([])
      setHasMore(false)
      if (reset) setNext(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initial.keyword.trim()) {
      loadResults(initial.type, initial.keyword, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    loadResults(searchType, keyword, true)
  }

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <section className="section search-section">
        <div className="search-hero">
          <div>
            <p className="eyebrow">{t('search.eyebrow')}</p>
            <h1>{t('search.title')}</h1>
            <p className="search-desc">{t('search.desc')}</p>
          </div>
          <div className="search-card">
            <form className="search-form" onSubmit={handleSubmit}>
              <label className="search-field">
                <span>{t('search.type.label')}</span>
                <select
                  value={searchType}
                  onChange={(event) => setSearchType(event.target.value as SearchType)}
                >
                  <option value="wiki">{t('search.type.wiki')}</option>
                  <option value="player">{t('search.type.player')}</option>
                </select>
              </label>
              <label className="search-field grow">
                <span>{t('search.keyword.label')}</span>
                <input
                  type="search"
                  value={keyword}
                  placeholder={t('search.keyword.placeholder')}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
              <button className="btn primary small" type="submit" disabled={loading}>
                {loading ? t('search.loading') : t('search.submit')}
              </button>
            </form>
          </div>
        </div>
        <div className="search-results-panel">
          <div className="search-results-header">
            <h2>{t('search.results.title')}</h2>
            <span>
              {hasSearched ? t('search.results.count', { count: results.length }) : t('search.results.ready')}
            </span>
          </div>
          {error ? <div className="search-status error">{error}</div> : null}
          {!error && !loading && hasSearched && results.length === 0 ? (
            <div className="search-status empty">{t('search.results.none')}</div>
          ) : null}
          {loading ? <div className="search-status loading">{t('search.loading')}</div> : null}
          {results.length ? (
            <>
              <ul className="search-results">
                {results.map((item) => {
                  if (item.kind === 'wiki') {
                    return (
                      <li key={`wiki-${item.pid}`} className="search-result">
                        <a className="search-result-link" href={`/wiki/${item.pid}`}>
                          <p className="search-result-title">{item.title}</p>
                          <span className="search-result-meta">
                            {t('search.results.wiki', { id: item.pid })}
                          </span>
                        </a>
                      </li>
                    )
                  }
                  return (
                    <li key={`player-${item.uid}`} className="search-result">
                      <a className="search-result-link" href={`/player/${item.uid}`}>
                        <p className="search-result-title">{item.username}</p>
                        <span className="search-result-meta">
                          {t('search.results.player', { id: item.uid })}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
              <div className="chart-actions">
                {hasMore ? (
                  <LoadMoreButton
                    label={t('search.loadMore')}
                    loadingLabel={t('search.loading')}
                    loading={loading}
                    onClick={() => loadResults(activeType, activeKeyword)}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </section>
      {auth.modal}
    </PageLayout>
  )
}

export default SearchPage
