import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, showNotify } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchChartTalk, saveTalk } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

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

/** talk/chart.html 的 <style>，附加 text-align 以抵消 simple.css 的 body 居中 */
const PAGE_STYLE = `
body { margin: 10px; text-align: left; }
.btn { float: right; font-size: 20px; background-color: #ef6666; color: white; text-align: center; padding: 0 24px; -webkit-border-radius: 20px; border-radius: 20px; height: 40px; line-height: 40px; cursor: pointer; }
#text { clear: both; margin-top: 20px; border: 1px solid black; width: 100%; height: 320px; font-size: 20px; resize: none; box-sizing: border-box; }
`

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
    <Shell variant="simple" css={[]}>
      <style>{PAGE_STYLE}</style>
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
