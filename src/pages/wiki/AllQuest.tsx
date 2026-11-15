import { useEffect, useState } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad } from '../../lib/useLoad'
import { LoadingBlock, EmptyBlock, JustifyRow } from '../../components/fragments'
import { URLS } from '../../lib/urls'
import { fetchQuestList } from '../../network/pageWeb'
import { t as i18nT } from '../../i18n'
import { listOf } from '../../utils/response'

type QuestItem = {
  id: number | string
  ptid?: number
  name?: string
  type?: number
  period?: number
  require?: string
  status?: number
  percent?: number
}
const FALLBACK: QuestItem[] = []

export default function AllQuest() {
  const { data, loading } = useLoad<QuestItem[]>(
    async () => listOf<QuestItem>(await fetchQuestList(), ['items', 'list']),
    [],
    FALLBACK,
  )

  const [items, setItems] = useState<QuestItem[]>([])
  useEffect(() => setItems(data ?? []), [data])

  const toggleStatus = (id: number | string) => {
    setItems((prev) => prev.map((it) => (
      it.id === id ? { ...it, status: it.status === 2 ? 0 : 2, percent: it.status === 2 ? 0 : 100 } : it
    )))
  }

  return (
    <Shell variant="wide" title={i18nT('Quest')} css={['akari.css']}>
      <div className="quest_tabs">
        <a className="g_btn g_round curr" href={URLS.allQuest}>{i18nT('Quest')}</a>
        <a className="g_btn g_round" href={URLS.allDaily}>{i18nT('Daily')}</a>
      </div>

      <div className="g_cont g_round all_quest">
        <p>{i18nT('quest_01')}</p>
        <p>{i18nT('quest_02')}</p>
        <div className="items">
          <JustifyRow>
            {items.map((it) => (
              <div className="item g_round" key={it.id} data-id={it.id} data-ptid={it.ptid ?? 0}>
                <div className="top">
                  <span>{it.name}</span>
                  {it.type === 0 && <i>{it.period}d</i>}
                </div>
                <p>{it.require}</p>
                <div>
                  {it.status === 2 ? (
                    <div className="status comp g_round"><span>{i18nT('Complete!')}</span></div>
                  ) : (
                    <div className="status do g_round" onClick={() => toggleStatus(it.id)}>
                      <div className="bar" style={{ width: `${it.percent ?? 0}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <LoadingBlock />}
            {!loading && items.length === 0 && <EmptyBlock />}
            <span className="justfix"></span>
          </JustifyRow>
        </div>
      </div>
    </Shell>
  )
}
