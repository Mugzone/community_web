import { useEffect, useState } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, LoadingBlock, EmptyBlock, JustifyRow } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchQuestList } from '../../network/legacy'

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

/** /page/all/quest —— 老站 list/quest.html + module/quest（base_width.html 宽版） */
export default function AllQuest() {
  const { data, loading } = useLoad<QuestItem[]>(
    async () => {
      const resp: any = await fetchQuestList()
      const p: any = resp?.data ?? resp
      return asArray<QuestItem>(p?.items ?? p?.list ?? p)
    },
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
    <Shell variant="wide" title="Quest" css={['akari.css']}>
      <div className="quest_tabs">
        <a className="g_btn g_round curr" href={URLS.allQuest}>Quest</a>
        <a className="g_btn g_round" href={URLS.allDaily}>Daily</a>
      </div>

      <div className="g_cont g_round all_quest">
        <p>quest_01</p>
        <p>quest_02</p>
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
                    <div className="status comp g_round"><span>Complete!</span></div>
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
