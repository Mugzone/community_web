import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, num, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchTalkNotify, deleteUserMsg } from '../../network/legacy'

/** notify.html + module/notify/src/init.js */
type NotifyItem = {
  read?: boolean
  talk?: {
    user?: { id?: number | string; username?: string }
    topic?: { key?: string }
  }
}
type NotifyState = {
  items: NotifyItem[]
  count: number
  user: { id?: number | string }
}

const EMPTY: NotifyState = { items: [], count: 0, user: {} }

const unwrap = (res: any): any => {
  if (!res || typeof res !== 'object') return {}
  const d = (res as any).data
  return d !== undefined && d !== null ? d : res
}

const normalize = (res: any): NotifyState => {
  const d: any = unwrap(res) || {}
  const items: NotifyItem[] = Array.isArray(d.items) ? d.items : []
  return {
    items,
    count: d.count === undefined ? items.length : num(d.count),
    user: d.user ?? {},
  }
}

/** module/notify/src/init.js 对 data-key 的解析 */
const keyToUrl = (key: string): string => {
  const arr = String(key ?? '').split('_')
  if (arr[0] === 'topic') return `/talk/topic/${arr[1]}`
  if (arr[0] === 'user') return `/talk/user/${arr[1]}/${arr[2]}`
  if (arr[0] === 'skin') return URLS.skinDetail(arr[1] ?? 0)
  return `/${arr[0]}/${arr[1]}`
}

export default function Notify() {
  const { data, loading, reload } = useLoad<NotifyState>(
    async () => normalize(await fetchTalkNotify()),
    [],
    EMPTY,
  )

  const onDeleteAll = async () => {
    if (!window.confirm('Are you sure to delete all notifications?')) return
    try {
      await deleteUserMsg()
      reload()
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  return (
    <Shell title="Notification" css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">Notification</div>
      <div className="g_cont notify">
        <div className="g_actbar">
          <a href={URLS.user(data.user?.id ?? 0)} className="g_btn">Back</a>
          <a href="#" className="g_btn btn" data-type="del" onClick={(e) => { e.preventDefault(); void onDeleteAll() }}>
            Delete all notifications
          </a>
        </div>

        {loading ? <LoadingBlock text="Loading..." /> : null}

        {data.count === 0 ? (
          <div className="g_memo"><span className="g_round">You have no notifications</span></div>
        ) : (
          <div className="list">
            {data.items.map((item, i) => {
              const user = item.talk?.user ?? {}
              const key = item.talk?.topic?.key ?? ''
              return (
                <div className={item.read === false ? 'item new' : 'item'} key={i}>
                  {item.read === false ? <>[New]{'\u00a0'}</> : null}
                  <a href={URLS.user(user.id ?? 0)}>{user.username ?? ''}</a>
                  {' '}replied to you{' '}
                  <a className="link link_key" target="_blank" href={keyToUrl(key)} data-key={key}>View</a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Shell>
  )
}
