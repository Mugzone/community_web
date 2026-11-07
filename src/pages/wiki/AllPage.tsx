import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, num, LoadingBlock, EmptyBlock, JustifyRow } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchAllPages } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

type PageItem = { id: number | string; title?: string }
type Model = { items: PageItem[]; total: number }
const FALLBACK: Model = { items: [], total: 1 }

/** /page/all —— 老站 all_page.html（base.html 两栏） */
export default function AllPage() {
  const [type, setType] = useState<'wiki' | 'song'>('wiki')
  const [page, setPage] = useState(1)

  // 接口响应形状由后端决定，统一用 any 承接，再显式收敛成 items/total。
  const { data, loading } = useLoad<Model>(
    async () => {
      const resp: any = await fetchAllPages(page, type)
      const p: any = resp?.data ?? resp
      return {
        items: asArray<PageItem>(p?.items ?? p?.list ?? p),
        total: num(p?.total ?? resp?.total, 1),
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
        {total > 1 && (
          <div className="g_more">
            {page > 1 ? (
              <a href={`${URLS.allPage}?page=${page - 1}&type=${type}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page - 1) }}>{i18nT('Prev')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{page}/{total}</span>
            {page < total ? (
              <a href={`${URLS.allPage}?page=${page + 1}&type=${type}`} className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPage(page + 1) }}>{i18nT('Next')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
