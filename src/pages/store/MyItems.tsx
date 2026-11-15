import { useState } from 'react'
import { DefaultSidebar, Shell } from '../../components/Layout'
import { asArray, num } from '../../utils/data'
import { EmptyBlock, JustifyRow, LoadingBlock } from '../../components/fragments'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { fetchMyItems, useStoreItem } from '../../network/pageContent'
import { t as i18nT } from '../../i18n'
import { payloadOf } from '../../utils/response'

type MyItemRow = {
  item?: {
    id?: number | string
    name?: string
    detail?: string
    type?: number | string
  }
  id?: number | string
  name?: string
  detail?: string
  type?: number | string
  endtime_str?: string
  count?: number | string
}

export default function MyItems() {
  const { data: rows, loading, error, reload } = useLoad<MyItemRow[]>(
    async () => asArray<MyItemRow>(payloadOf(await fetchMyItems())),
    [],
    [] as MyItemRow[],
  )
  const [lock, setLock] = useState(false)

  const onUse = async (id: number | string) => {
    const sid = num(id, 0)
    if (sid === 1) {
      window.location.href = '/upload/banner'
      return
    }
    if (sid === 2) {
      showNotify('Delete score in chart page', 'succ')
      return
    }
    if (sid === 3) {
      window.location.href = '/accounts/config/profile'
      return
    }
    if (lock) return
    setLock(true)
    try {
      const resp = await useStoreItem(id)
      const code = num(resp?.code, 0)
      if (code < 0) {
        const msg =
          code === -3 ? 'No item available'
            : code === -2 ? i18nT('Operation failed')
              : 'Internal error'
        showNotify(msg, 'err')
      } else {
        showNotify(String(resp?.data?.msg ?? resp?.msg ?? 'Successful'), 'succ')
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
      title={i18nT('Items')}
      css={['store.css', 'akari.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <a href="/store/all">{i18nT('Store')}</a>
        </>
      }
    >
      <div className="g_title">{i18nT('Items')}</div>
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
                    <span className="name">{it.name ?? ''}</span>
                    <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); void onUse(id) }}>Use</a>
                  </p>
                  <p className="des">{it.detail ?? ''}</p>
                  <p className="sub">
                    {type === 1
                      ? <>Expire Date:{row.endtime_str ?? ''}</>
                      : <>Left:{row.count ?? 0}</>}
                  </p>
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
