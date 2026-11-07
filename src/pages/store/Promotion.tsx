import { useState } from 'react'
import { Shell } from '../../components/Layout'
import { num, showNotify, useLoad } from '../../lib/legacy'
import { fetchPromotion, submitBid } from '../../network/legacy'

export default function Promotion() {
  const { data, reload } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchPromotion()
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [],
    {} as Record<string, any>,
  )
  const [lock, setLock] = useState(false)

  const have = !!(data.have ?? data.have_ticket)
  const count = num(data.count, 0)
  const low = num(data.low, 0)
  const my = num(data.my, 0)

  const onBid = async (price: number) => {
    if (!window.confirm(`Are you sure to add ${price}?`)) return
    if (lock) return
    setLock(true)
    try {
      const resp = await submitBid({ price })
      const code = num(resp?.code, 0)
      if (code < 0) {
        const msg =
          code === -2 ? 'You already have one promotion ticket'
            : code === -3 ? "You don't have enough gold"
              : 'System error'
        showNotify(msg, 'err')
      } else {
        showNotify('Successful', 'succ')
        reload()
      }
    } catch {
      showNotify('System error', 'err')
    } finally {
      setLock(false)
    }
  }

  return (
    <Shell variant="wide" title="Chart Promotion System" css={['store.css']}>
      <div className="g_title">Chart Promotion System</div>
      <div className="g_cont c_pm">
        <p>Please read <a href="/wiki/1980">this page</a> before using the system.</p>
        <div className="bid">
          {have ? (
            <p>You already have one promotion ticket</p>
          ) : (
            <>
              <p>
                <label>Current bidders</label>:<span>{count}</span>
                <label style={{ marginLeft: 20 }}>Current price</label>:<span>{low}</span>
                <label style={{ marginLeft: 20 }}>My bid</label>:<span>{my}</span>
              </p>
              <div>
                <label>Increment</label>:
                <div className="g_select" data-key="price">
                  {[1000, 2000, 5000].map((p) => (
                    <span key={p} data-id={p} onClick={() => void onBid(p)}>{p}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
