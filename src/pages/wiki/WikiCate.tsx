import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, showNotify, LoadingBlock, EmptyBlock, JustifyRow } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchWikiCategory, deleteWikiCategory, mergeWikiCategory } from '../../network/legacy'

/* ------------------------------------------------------------------ *
 * wiki_cate.html（base.html 两栏, akari.css）+ module/wikiCate
 * ------------------------------------------------------------------ */

type CateItem = { id?: number | string; title?: string }
type CateState = {
  id: number | string
  name: string
  items: CateItem[]
}
const EMPTY_CATE: CateState = { id: 0, name: '', items: [] }
const PER_PAGE = 20

export default function WikiCate() {
  const params = useParams<{ id?: string }>()
  const cateId = params.id
    ?? new URLSearchParams(window.location.search).get('id')
    ?? window.location.pathname.match(/\/(\d+)\/?$/)?.[1]
    ?? ''
  const [page, setPage] = useState<number>(1)

  const { data, loading, reload } = useLoad<CateState>(
    async () => {
      const resp: any = await fetchWikiCategory(cateId).catch(() => ({}))
      const d: any = resp?.data ?? resp ?? {}
      const cate: any = d.cate ?? d.category ?? {}
      return {
        id: cate.id ?? cateId,
        name: String(cate.name ?? d.name ?? ''),
        items: asArray<CateItem>(d.items ?? d.list ?? d),
      }
    },
    [cateId, page],
    EMPTY_CATE,
  )

  const total = Math.max(1, Math.ceil(data.items.length / PER_PAGE))
  const pageItems = data.items.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const goPage = (p: number): void => {
    if (p < 1 || p > total) return
    setPage(p)
  }

  /* module/wikiCate —— 删除 / 合并分类 */
  const onDelete = async (): Promise<void> => {
    try {
      await deleteWikiCategory(cateId)
      window.location.href = URLS.index
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const onMerge = async (): Promise<void> => {
    const v = window.prompt('enter the category id you want to merge to', '')
    const to = Number(v)
    if (!to || to <= 0) return
    try {
      await mergeWikiCategory(cateId, to)
      window.location.href = URLS.cate(to)
    } catch {
      showNotify('Merge failed', 'err')
    }
  }

  return (
    <Shell
      variant="two-col"
      title={`Category: ${data.name}`}
      css={['akari.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>Help</h4>
          <a href={URLS.wiki(4)}>About Category</a>
        </>
      }
    >
      <div className="g_title">Category:&nbsp;{data.name}</div>
      <div className="g_cont" data-id={data.id}>
        <div className="g_actbar">
          <a href="#" className="g_btn btn" data-type="merge" onClick={(e) => { e.preventDefault(); void onMerge() }}>Merge with...</a>
          <a href="#" className="g_btn btn" data-type="del" onClick={(e) => { e.preventDefault(); void onDelete() }}>Delete</a>
          <a href="#" className="g_btn btn" data-type="reload" onClick={(e) => { e.preventDefault(); reload() }}>Refresh</a>
        </div>

        <div className="wiki_cate">
          <h1>{data.items.length}&nbsp;page(s) in this category</h1>
          <JustifyRow>
            {pageItems.map((item, i) => (
              <a key={`${item.id ?? 'i'}-${i}`} className="textfix" href={URLS.wiki(item.id ?? 0)}>{item.title ?? ''}</a>
            ))}
            <span className="justfix"></span>
          </JustifyRow>
          {loading && <LoadingBlock />}
          {!loading && data.items.length === 0 && <EmptyBlock />}
        </div>

        {total > 1 && (
          <div className="g_more">
            {page > 1 ? (
              <a href={`${URLS.cate(data.id)}?page=${page - 1}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page - 1) }}>Prev</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{page}/{total}</span>
            {page < total ? (
              <a href={`${URLS.cate(data.id)}?page=${page + 1}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page + 1) }}>Next</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
