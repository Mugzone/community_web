import { useState } from 'react'
import { Shell } from '../../components/Layout'
import { asArray, num, Pager, useLoad } from '../../lib/legacy'
import { fetchLimitList } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

/* list/limit.html：extended base_width.html，页面级 akari.css。数据 fetchLimitList(page) */
type Rec = Record<string, any>
type LimitData = { items: Rec[]; total: number }
const FALLBACK: LimitData = { items: [], total: 1 }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))

/* 复刻 account/templatetags/limit_reason.py 的位掩码顺序 */
const limitText = (level: number): string => {
  if ((level & 1) > 0) return 'Change Wiki/Meta'
  if ((level & 2) > 0) return 'Submit Scores'
  if ((level & 4) > 0) return 'Upload Chart'
  if ((level & 8) > 0) return 'Change Avatar/Banner'
  if ((level & 32) > 0) return 'Recommend/Unrecommend'
  if ((level & 16) > 0) return 'Follow Others'
  if ((level & 64) > 0) return 'MP/Chat'
  if ((level & 128) > 0) return 'Upload Skin'
  return ''
}

export default function Limit() {
  const [page, setPage] = useState(1)
  const { data } = useLoad<LimitData>(
    async () => {
      const res = (await fetchLimitList(page)) as Rec
      const d: Rec = (res?.data ?? {}) as Rec
      return {
        items: asArray<Rec>(d.list ?? d.items ?? d.data ?? res?.data ?? res),
        total: Math.max(1, num(d.total ?? d.pages ?? res?.total, 1)),
      }
    },
    [page],
    FALLBACK,
  )

  return (
    <Shell variant="wide" title="Jail" css={['akari.css']} contCls="">
      <div className="g_title">The Jail</div>
      <div className="g_cont">
        <div className="items">
          <table className="jail_table">
            <thead>
              <tr>
                <th style={{ width: '200px' }}>{i18nT('Name')}</th>
                <th style={{ width: '250px' }}>Limitation</th>
                <th style={{ width: '200px' }}>{i18nT('Release Date')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: Rec, i: number) => {
                const u: Rec = (item.user ?? item) as Rec
                return (
                  <tr key={i}>
                    <td>{s(u.username ?? item.username ?? item.name)}</td>
                    <td>{limitText(num(item.level))}</td>
                    <td>{s(item.end_str ?? item.end ?? item.time_str)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={data.total} onChange={(p: number) => { setPage(p) }} />
      </div>
    </Shell>
  )
}
