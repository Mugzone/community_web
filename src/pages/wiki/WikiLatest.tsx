import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchWikiLatest } from '../../network/legacy'

type ChangeItem = {
  user_id?: number | string
  user?: { id?: number | string; username?: string }
  username?: string
  link?: string
  msg?: string
  create_time_str?: string
}
const FALLBACK: ChangeItem[] = []

const uidOf = (it: ChangeItem): number | string => it.user_id ?? it.user?.id ?? 0
const nameOf = (it: ChangeItem): string => it.user?.username ?? it.username ?? ''

/** /page/latest —— 老站 wiki_latest.html（base.html 两栏） */
export default function WikiLatest() {
  const { data, loading } = useLoad<ChangeItem[]>(
    async () => {
      const resp: any = await fetchWikiLatest(1)
      const p: any = resp?.data ?? resp
      return asArray<ChangeItem>(p?.changes ?? p?.items ?? p?.list ?? p)
    },
    [],
    FALLBACK,
  )

  const items = data ?? []

  return (
    <Shell variant="two-col" css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">Recent Changes</div>
      <div className="g_cont wiki_change">
        {items.map((it, i) => (
          <h1 key={i}>
            <a className="red" href={URLS.user(uidOf(it))}>{nameOf(it)}</a>:
            <a href={it.link}>{it.msg}</a>
            <span className="textfix gray">-- {it.create_time_str}</span>
          </h1>
        ))}
        {!loading && items.length === 0 && <h1>No Active Edit</h1>}
        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
