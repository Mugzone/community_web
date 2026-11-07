import { useState } from 'react'
import { DefaultSidebar, Shell } from '../../components/Layout'
import { asArray, EmptyBlock, JustifyRow, LoadingBlock, num, showNotify, useLoad } from '../../lib/legacy'
import { buyStoreItem, fetchMyItems } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

/** 老站 list/store.html：items 里每项是 {item: {...}, buy?: {...}}，也兼容扁平结构。 */
type StoreItemRow = {
  item?: {
    id?: number | string
    name?: string
    price?: number | string
    detail?: string
    type?: number | string
  }
  id?: number | string
  name?: string
  price?: number | string
  detail?: string
  type?: number | string
  buy?: { endtime_str?: string; count?: number | string }
  endtime_str?: string
  count?: number | string
}

export default function StoreAll() {
  const { data: rows, loading, error, reload } = useLoad<StoreItemRow[]>(
    async () => {
      const resp = await fetchMyItems()
      return asArray<StoreItemRow>(resp?.data ?? resp)
    },
    [],
    [] as StoreItemRow[],
  )
  const [lock, setLock] = useState(false)

  const onBuy = async (id: number | string) => {
    if (lock) return
    setLock(true)
    try {
      const resp = await buyStoreItem(id)
      const code = num(resp?.code, 0)
      if (code < 0) {
        const msg =
          code === -4 ? 'You already have it!'
            : code === -3 ? 'Gold not enough'
              : code === -2 ? i18nT('Operation failed')
                : 'Internal error'
        showNotify(msg, 'err')
      } else {
        showNotify(`Thanks for coming, gold: -${num(resp?.data?.price ?? resp?.price, 0)}`, 'succ')
        reload()
      }
    } catch {
      showNotify('Internal error', 'err')
    } finally {
      setLock(false)
    }
  }

  return (
    <Shell
      variant="two-col"
      title={i18nT('Store')}
      css={['store.css', 'akari.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <a href="/store/my">My items</a>
          {/* Chart Promotion 在老站线上早已下线，不再保留入口 */}
        </>
      }
    >
      <div className="g_title">{i18nT('Store')}</div>
      <div className="g_cont all_store">
        <div className="items">
          {loading && <LoadingBlock />}
          {!loading && error && rows.length === 0 && <EmptyBlock />}
          <JustifyRow>
            {rows.map((row, idx) => {
              const it = row.item ?? row
              const id = it.id ?? ''
              const type = num(it.type, 0)
              return (
                <div className="item g_round" data-id={id} key={`${id}-${idx}`}>
                  <p>
                    <span className="name">{it.name ?? ''}</span><span className="price">{num(it.price, 0)} gold</span>
                    <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); void onBuy(id) }}>Buy</a>
                  </p>
                  <p className="des">{it.detail ?? ''}</p>
                  {row.buy && (
                    <p className="sub">
                      {type === 1
                        ? <>Expire Date:{row.buy.endtime_str ?? ''}</>
                        : <>Left:{row.buy.count ?? 0}</>}
                    </p>
                  )}
                </div>
              )
            })}
            <span className="justfix"></span>
          </JustifyRow>
        </div>
      </div>
    </Shell>
  )
}
