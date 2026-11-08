import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, showNotify } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchChartTalk, saveTalk } from '../../network/legacy'
import { t as i18nT } from '../../i18n'
import './ChartTalk.css'

/** talk/chart.html —— 客户端谱面评价留言（独立整页，自带内联样式） */
type ChartTalkState = {
  cid: number | string
  uid: number | string
  key: string
}

const EMPTY: ChartTalkState = { cid: 0, uid: 0, key: '' }

const unwrap = (res: any): any => {
  if (!res || typeof res !== 'object') return {}
  const d = (res as any).data
  return d !== undefined && d !== null ? d : res
}

export default function ChartTalk() {
  const [sp] = useSearchParams()
  const cid = sp.get('cid') ?? '0'

  const { data } = useLoad<ChartTalkState>(
    async () => {
      const res = await fetchChartTalk(cid)
      const d: any = unwrap(res) || {}
      return {
        cid: d.cid ?? cid,
        uid: d.uid ?? sp.get('uid') ?? 0,
        key: String(d.key ?? sp.get('key') ?? ''),
      }
    },
    [cid],
    EMPTY,
  )

  const [text, setText] = useState('')
  const [lock, setLock] = useState(false)

  const onSubmit = async () => {
    const content = text.trim()
    if (content === '') {
      return
    }
    if (lock) return
    setLock(true)
    try {
      await saveTalk({ key: `chart_${data.cid}`, content })
      window.location.href = URLS.chartPage(data.cid)
    } catch {
      showNotify('Server error', 'err')
    } finally {
      setLock(false)
    }
  }

  return (
    <Shell variant="simple" page="chart_talk" css={[]}>
      <div className="edit">
        <div className="btn" onClick={(e) => { e.preventDefault(); void onSubmit() }}>{i18nT('Submit')}</div>
        <textarea
          name=""
          id="text"
          cols={30}
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
        ></textarea>
      </div>
    </Shell>
  )
}
