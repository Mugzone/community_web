import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad } from '../../lib/useLoad'
import { LoadingBlock } from '../../components/fragments'
import { URLS } from '../../lib/urls'
import { fetchWikiLatest } from '../../network/pageWeb'
import { t as i18nT } from '../../i18n'
import { listOf } from '../../utils/response'
import { changeKeyOf, nameOf, uidOf, type ChangeItem } from './wikiChangeModel'

const FALLBACK: ChangeItem[] = []

export default function WikiLatest() {
  const { data, loading } = useLoad<ChangeItem[]>(
    async () => listOf<ChangeItem>(await fetchWikiLatest(1), ['changes', 'items', 'list']),
    [],
    FALLBACK,
  )

  const items = data ?? []

  return (
    <Shell variant="two-col" css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">{i18nT('Recent Changes')}</div>
      <div className="g_cont wiki_change">
        {items.map((it, i) => (
          <h1 key={changeKeyOf(it, i)}>
            <a className="red" href={URLS.user(uidOf(it))}>{nameOf(it)}</a>:
            <a href={it.link}>{it.msg}</a>
            <span className="textfix gray">-- {it.create_time_str}</span>
          </h1>
        ))}
        {!loading && items.length === 0 && <h1>{i18nT('No Active Edit')}</h1>}
        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
