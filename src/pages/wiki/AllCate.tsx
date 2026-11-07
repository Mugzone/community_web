import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, num, LoadingBlock, EmptyBlock, JustifyRow } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchSpecialList } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

type CateItem = { id: number | string; name?: string }
type Model = { items: CateItem[]; total: number }
const FALLBACK: Model = { items: [], total: 1 }

/** /page/all/cate —— 老站 all_cate.html（base.html 两栏）
 *  special 视图 name='cate' 即渲染 all_cate.html，故复用 fetchSpecialList('cate')。 */
export default function AllCate() {
  const [page, setPage] = useState(1)

  const { data, loading } = useLoad<Model>(
    async () => {
      const resp: any = await fetchSpecialList('cate', page)
      const p: any = resp?.data ?? resp
      return {
        items: asArray<CateItem>(p?.items ?? p?.list ?? p),
        total: num(p?.total, 1),
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
        {total > 1 && (
          <div className="g_more">
            {page > 1 ? (
              <a href={`${URLS.allCate}?page=${page - 1}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page - 1) }}>{i18nT('Prev')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{page}/{total}</span>
            {page < total ? (
              <a href={`${URLS.allCate}?page=${page + 1}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page + 1) }}>{i18nT('Next')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
