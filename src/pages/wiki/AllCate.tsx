import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { LinkPager } from '../../components/LinkPager'
import { useLoad } from '../../lib/useLoad'
import { LoadingBlock, EmptyBlock, JustifyRow } from '../../components/fragments'
import { URLS } from '../../lib/urls'
import { fetchSpecialList } from '../../network/pageWeb'
import { t as i18nT } from '../../i18n'
import { listOf, pageCountOf } from '../../utils/response'

type CateItem = { id: number | string; name?: string }
type Model = { items: CateItem[]; total: number }
const FALLBACK: Model = { items: [], total: 1 }

export default function AllCate() {
  const [page, setPage] = useState(1)

  const { data, loading } = useLoad<Model>(
    async () => {
      const resp = await fetchSpecialList('cate', page)
      return {
        items: listOf<CateItem>(resp, ['items', 'list']),
        total: pageCountOf(resp),
      }
    },
    [page],
    FALLBACK,
  )

  const items = data.items ?? []
  const total = data.total || 1

  const goPage = (p: number) => {
    if (p < 1 || p > total) return
    setPage(p)
  }

  return (
    <Shell
      variant="two-col"
      title={i18nT('Category')}
      css={['akari.css']}
      sidebar={<DefaultSidebar />}
    >
      <div className="g_title">{i18nT('Category')}</div>
      <div className="g_cont">
        <div className="wiki_cate">
          <JustifyRow>
            {items.map((item) => (
              <a key={item.id} className="textfix" href={URLS.cate(item.id)}>{item.name}</a>
            ))}
            <span className="justfix"></span>
          </JustifyRow>
        </div>
        {loading && <LoadingBlock />}
        {!loading && items.length === 0 && <EmptyBlock />}
        <LinkPager base={URLS.allCate} page={page} total={total} onChange={goPage} />
      </div>
    </Shell>
  )
}
