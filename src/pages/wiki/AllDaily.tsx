import { Shell } from '../../components/Layout'
import { useLoad, asArray, LoadingBlock, EmptyBlock } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchDailyList } from '../../network/legacy'
import { t as i18nT } from '../../i18n'
import { coverUrl } from '../../utils/formatters'

type DailyItem = { id: number | string; title?: string; version?: string; cover?: string; mode?: number }
const FALLBACK: DailyItem[] = []

/** /page/all/daily —— 老站 list/daily.html（base_width.html 宽版） */
export default function AllDaily() {
  const { data, loading } = useLoad<DailyItem[]>(
    async () => {
      const resp: any = await fetchDailyList()
      const p: any = resp?.data ?? resp
      return asArray<DailyItem>(p?.items ?? p?.list ?? p)
    },
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
