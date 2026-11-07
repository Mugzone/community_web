import { useState, type ChangeEvent } from 'react'
import { Shell } from '../../components/Layout'
import { asArray, showNotify, useLoad } from '../../lib/legacy'
import { activateInvite, fetchInviteInfo } from '../../network/legacy'

/* profile/invite.html：extended base_width.html，交互复用 module/account init.js 的 J_code 分支 */
type Rec = Record<string, any>
type InviteData = { needInvite: boolean; list: Rec[] }
const FALLBACK: InviteData = { needInvite: true, list: [] }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))

/* .g_tip 的 3 个 span，顺序即 util.showTip(n) 下标 */
const TIPS: { text: string; err: boolean }[] = [
  { text: 'Submitting...', err: false },
  { text: 'Code been used', err: true },
  { text: 'Code does not exist!', err: true },
]

export default function Invite() {
  const { data } = useLoad<InviteData>(
    async () => {
      const res = (await fetchInviteInfo()) as Rec
      const inner: Rec = (res?.data && !Array.isArray(res.data) && typeof res.data === 'object')
        ? (res.data as Rec)
        : {}
      return {
        needInvite: Boolean(res.need_invite ?? res.needInvite ?? inner.need_invite ?? inner.needInvite ?? false),
        list: asArray<Rec>(inner.list ?? inner.items ?? inner.data ?? res.list ?? res.items ?? res.data ?? res),
      }
    },
    [],
    FALLBACK,
  )

  const [code, setCode] = useState('')
  const [tip, setTip] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [needInviteOverride, setNeedInviteOverride] = useState<boolean | undefined>(undefined)
  const needInvite = needInviteOverride ?? data.needInvite

  const active = async () => {
    if (busy) return
    const c = code.trim()
    if (!c) {
      setTip(2)
      showNotify('Code does not exist!', 'err')
      return
    }
    setTip(0)
    showNotify('Submitting...', 'succ')
    setBusy(true)
    try {
      const res = await activateInvite(c)
      const rc = res?.code
      if (rc !== undefined && Number(rc) !== 0) {
        // module/account init.js J_code 分支：-2 码不存在，-3 码已用
        const idx = Number(rc) === -2 ? 2 : 1
        setTip(idx)
        showNotify(TIPS[idx].text, 'err')
        return
      }
      setTip(null)
      setNeedInviteOverride(false)
      showNotify('success', 'succ')
    } catch {
      setTip(1)
      showNotify('Code been used', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell variant="wide" title="Invite" css={['akari.css']} contCls="">
      <div className="g_title">Invite</div>
      <div className="g_cont">
        {needInvite ? (
          <div className="invite">
            <h1>
              <label htmlFor="code">Code</label>
              <input type="text" name="code" id="code" value={code} onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)} />
              <span className="g_btn btn" id="J_code" onClick={() => void active()}>Active</span>
            </h1>
            <div className="g_tip">
              {TIPS.map((d, i: number) => (
                <span key={i} className={`${d.err ? 'err' : ''}${tip === i ? ' curr' : ''}`.trim()}>{d.text}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="items">
            <table className="jail_table">
              <thead>
                <tr>
                  <th style={{ width: '200px' }}>Code</th>
                  <th style={{ width: '250px' }}>Invited</th>
                  <th style={{ width: '200px' }}>Invite Date</th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((item: Rec, i: number) => (
                  <tr key={i}>
                    <td>{s(item.code)}</td>
                    <td>{s(item.usedby)}</td>
                    <td>{s(item.time_str ?? item.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  )
}
