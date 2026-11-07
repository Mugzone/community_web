import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, num, LoadingBlock, EmptyBlock, JustifyRow } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchSpecialList } from '../../network/legacy'

type SpecialItem = { id: number | string; name?: string }
type Model = { items: SpecialItem[]; total: number }
const FALLBACK: Model = { items: [], total: 1 }

/** /page/special/<name> —— 老站 all_cate.html（name=cate）/ list/tmpl.html（name=tmpl） */
export default function SpecialList() {
  const { name = 'cate' } = useParams()
  const isTmpl = name === 'tmpl'
  const [page, setPage] = useState(1)

  const { data, loading } = useLoad<Model>(
    async () => {
      const resp: any = await fetchSpecialList(name, page)
      const p: any = resp?.data ?? resp
      return {
        items: asArray<SpecialItem>(p?.items ?? p?.list ?? p),
        total: num(p?.total, 1),
      }
    },
    [name, page],
    FALLBACK,
  )

  const items = data.items ?? []
  const total = data.total || 1

  const goPage = (p: number) => {
    if (p < 1 || p > total) return
    setPage(p)
  }

  const base = isTmpl ? `/page/special/${name}` : URLS.allCate

  return (
    <Shell
      variant="two-col"
      title={isTmpl ? 'Templates' : 'Category'}
      css={['akari.css']}
      sidebar={<DefaultSidebar />}
    >
      <div className="g_title">{isTmpl ? 'Template' : 'Category'}</div>
      <div className="g_cont">
        <div className="wiki_cate">
          <JustifyRow>
            {items.map((it) => (
              <a
                key={it.id}
                className="textfix"
                href={isTmpl ? `/page/tmpl/${it.id}` : URLS.cate(it.id)}
              >
                {it.name}
              </a>
            ))}
            <span className="justfix"></span>
          </JustifyRow>
        </div>
        {loading && <LoadingBlock />}
        {!loading && items.length === 0 && <EmptyBlock />}
        {total > 1 && (
          <div className="g_more">
            {page > 1 ? (
              <a href={`${base}?page=${page - 1}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page - 1) }}>Prev</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{page}/{total}</span>
            {page < total ? (
              <a href={`${base}?page=${page + 1}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page + 1) }}>Next</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
