import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { LinkPager } from '../../components/LinkPager'
import { useLoad } from '../../lib/useLoad'
import { LoadingBlock, EmptyBlock, JustifyRow } from '../../components/fragments'
import { URLS } from '../../lib/urls'
import { fetchAllPages } from '../../network/pageWeb'
import { t as i18nT } from '../../i18n'
import { listOf, pageCountOf } from '../../utils/response'

type PageItem = { id: number | string; title?: string }
type Model = { items: PageItem[]; total: number }
const FALLBACK: Model = { items: [], total: 1 }

export default function AllPage() {
  const [type, setType] = useState<'wiki' | 'song'>('wiki')
  const [page, setPage] = useState(1)

  const { data, loading } = useLoad<Model>(
    async () => {
      const resp = await fetchAllPages(page, type)
      return {
        items: listOf<PageItem>(resp, ['items', 'list']),
        total: pageCountOf(resp, true),
      }
    },
    [page, type],
    FALLBACK,
  )

  const items = data.items ?? []
  const total = data.total || 1

  const goPage = (p: number) => {
    if (p < 1 || p > total) return
    setPage(p)
  }

  const changeType = (t: 'wiki' | 'song') => {
    setType(t)
    setPage(1)
  }

  return (
    <Shell
      variant="two-col"
      title={i18nT('Pages')}
      css={['akari.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>Index</h4>
          <a href={`${URLS.allPage}?type=song`} onClick={(e) => { e.preventDefault(); changeType('song') }}>{i18nT('Songs')}</a>
          <h4>Special</h4>
          <a href={URLS.limit}>The Jail</a>
        </>
      }
    >
      <div className="g_title">{i18nT('Page')}</div>
      <div className="g_cont">
        <div className="wiki_cate">
          <JustifyRow>
            {items.map((item) => (
              <a
                key={item.id}
                className="textfix"
                href={type === 'song' ? URLS.song(item.id) : URLS.wiki(item.id)}
              >
                {item.title}
              </a>
            ))}
            <span className="justfix"></span>
          </JustifyRow>
        </div>
        {loading && <LoadingBlock />}
        {!loading && items.length === 0 && <EmptyBlock />}
        <LinkPager base={URLS.allPage} page={page} total={total} extraQuery={`type=${type}`} onChange={goPage} />
      </div>
    </Shell>
  )
}
