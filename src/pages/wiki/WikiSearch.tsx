import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, num, LoadingBlock, Pager, JustifyRow } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { searchWiki, searchPlayer } from '../../network/api'
import { fetchWikiSearch } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

/* ------------------------------------------------------------------ *
 * wiki_search.html / wiki_404.html（base.html 两栏, akari.css）
 * ------------------------------------------------------------------ */

const query = (k: string): string => new URLSearchParams(window.location.search).get(k) ?? ''

type SearchItem = {
  id?: number | string
  pid?: number | string
  uid?: number | string
  title?: string
  artist?: string
  username?: string
  song?: { title?: string }
  author?: { username?: string }
}
type SearchState = {
  songs: SearchItem[]
  charts: SearchItem[]
  pages: SearchItem[]
  users: SearchItem[]
  total: number
}
const EMPTY_SEARCH: SearchState = { songs: [], charts: [], pages: [], users: [], total: 1 }

export default function WikiSearch() {
  const initialKeyword = query('keyword') || query('title') || query('q') || query('query')
  const [keyword, setKeyword] = useState<string>(initialKeyword)
  const [draft, setDraft] = useState<string>(initialKeyword)
  const [page, setPage] = useState<number>(1)

  const { data, loading } = useLoad<SearchState>(
    async () => {
      if (!keyword) return EMPTY_SEARCH
      const [r, w, p] = await Promise.all([
        fetchWikiSearch(keyword).catch(() => ({})),
        searchWiki({ keyword, from: (page - 1) * 20, limit: 20 }).catch(() => ({})),
        searchPlayer({ keyword, from: (page - 1) * 20, limit: 20 }).catch(() => ({})),
      ])
      const d: any = (r as any)?.data ?? r ?? {}
      return {
        songs: asArray<SearchItem>(d.songs ?? d.song),
        charts: asArray<SearchItem>(d.charts ?? d.chart),
        pages: asArray<SearchItem>(d.pages ?? d.page ?? (w as any)?.data ?? w),
        users: asArray<SearchItem>(d.users ?? d.user ?? (p as any)?.data ?? p),
        total: num(d.total, 1),
      }
    },
    [keyword, page],
    EMPTY_SEARCH,
  )

  const onSearch = (): void => {
    setKeyword(draft)
    setPage(1)
    window.history.replaceState(null, '', `${URLS.search}?keyword=${encodeURIComponent(draft)}`)
  }

  const onPage = (p: number): void => {
    setPage(p)
  }

  const hasResults = data.songs.length + data.charts.length + data.pages.length + data.users.length > 0

  const searchBox = (
    <div className="gcse-searchbox-only">
      <input
        className="g_input"
        type="text"
        value={draft}
        placeholder={i18nT('Search')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch() }}
      />
      <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); onSearch() }}>{i18nT('Search')}</a>
    </div>
  )

  return (
    <Shell
      variant="two-col"
      title={`Search: ${keyword}`}
      css={['akari.css']}
      sidebar={<DefaultSidebar />}
    >
      {hasResults || !keyword ? (
        <>
          <div className="g_title">Search:&nbsp;{keyword}</div>
          <div className="g_cont wiki_cate">
            <p className="search">{i18nT('Try other searches:')}</p>
            {searchBox}

            {data.songs.length > 0 && (
              <>
                <h1>Song(20 limit)</h1>
                <JustifyRow>
                  {data.songs.map((item, i) => (
                    <a key={`s${i}`} className="textfix" href={URLS.song(item.id ?? 0)}>{item.title ?? ''} - {item.artist ?? ''}</a>
                  ))}
                </JustifyRow>
              </>
            )}
            <span className="justfix"></span>

            {data.charts.length > 0 && (
              <>
                <h1>{i18nT('Chart')}</h1>
                <JustifyRow>
                  {data.charts.map((item, i) => (
                    <a key={`c${i}`} className="textfix" href={URLS.chartPage(item.id ?? 0)}>{item.song?.title ?? ''} - {item.author?.username ?? ''}</a>
                  ))}
                </JustifyRow>
              </>
            )}
            <span className="justfix"></span>

            {data.pages.length > 0 && (
              <>
                <h1>{i18nT('Pages (20 limit)')}</h1>
                <JustifyRow>
                  {data.pages.map((item, i) => (
                    <a key={`p${i}`} className="textfix" href={URLS.wiki(item.id ?? item.pid ?? 0)}>{item.title ?? ''}</a>
                  ))}
                </JustifyRow>
              </>
            )}
            <span className="justfix"></span>

            {data.users.length > 0 && (
              <>
                <h1>Players (20 limit)</h1>
                <JustifyRow>
                  {data.users.map((item, i) => (
                    <a key={`u${i}`} className="textfix" href={URLS.user(item.id ?? item.uid ?? 0)}>{item.username ?? ''}</a>
                  ))}
                </JustifyRow>
              </>
            )}
            <span className="justfix"></span>

            {loading && <LoadingBlock />}
            <Pager page={page} total={data.total} onChange={onPage} />
          </div>
        </>
      ) : (
        <>
          <div className="g_title">{i18nT('Page Not Found')}</div>
          <div className="g_cont p404">
            <p className="search">{i18nT('Try other searches:')}</p>
            {searchBox}
            {keyword && (
              <>
                The page you search is not found, try another keyword or{' '}
                <a className="g_btn" href={`${URLS.create}?title=${encodeURIComponent(keyword)}`}>{i18nT('Create a new page')}</a>
              </>
            )}
            {!keyword && <img src="/static/img/404.png" alt="404" />}
          </div>
        </>
      )}
    </Shell>
  )
}
