import { Shell } from '../../components/Layout'
import { useLoad } from '../../lib/useLoad'
import { LoadingBlock, EmptyBlock } from '../../components/fragments'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchDailyList } from '../../network/pageWeb'
import { t as i18nT } from '../../i18n'
import { coverUrl } from '../../utils/formatters'
import { listOf } from '../../utils/response'

type DailyItem = { id: number | string; title?: string; version?: string; cover?: string; mode?: number }
const FALLBACK: DailyItem[] = []

export default function AllDaily() {
  const { data, loading } = useLoad<DailyItem[]>(
    async () => listOf<DailyItem>(await fetchDailyList(), ['items', 'list']),
    [],
    FALLBACK,
  )

  const items = data ?? []

  return (
    <Shell variant="wide" title={i18nT('Daily')} css={['akari.css', 'tmpl.css']}>
      <div className="quest_tabs">
        <a className="g_btn g_round" href={URLS.allQuest}>{i18nT('Quest')}</a>
        <a className="g_btn g_round curr" href={URLS.allDaily}>{i18nT('Daily')}</a>
      </div>

      <div className="g_cont g_round" style={{ textAlign: 'left' }}>
        <p>{i18nT('quest_04')}</p>
        <div className="items">
          {items.map((it) => (
            <div className="g_tmpl_event" key={it.id}>
              {it.cover
                ? <a href={URLS.chartPage(it.id)} style={{ backgroundImage: `url(${coverUrl(it.cover)})` }}></a>
                : <a href={URLS.chartPage(it.id)}></a>}
              <div className="right">
                <p className="title textfix">
                  <img src={staticUrl(`img/mode/mode-${it.mode}.png`)} alt="" />
                  <span className="textfix" style={{ maxWidth: 150 }}>{it.title}</span>-{it.version}
                </p>
                <p>Search c{it.id} in game to download</p>
              </div>
            </div>
          ))}
          {loading && <LoadingBlock />}
          {!loading && items.length === 0 && <EmptyBlock />}
          <span className="justfix"></span>
        </div>
      </div>
    </Shell>
  )
}
