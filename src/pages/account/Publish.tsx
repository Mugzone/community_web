import { useState, type ChangeEvent } from 'react'
import { Shell } from '../../components/Layout'
import { asArray, showNotify, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchPublisher, operatePublisher } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

/* admin/admin_pub.html：extended base_width.html，交互对应 module/publish/src/init.js */
type Rec = Record<string, any>
type PubData = { assistants: Rec[]; activities: Rec[] }
const FALLBACK: PubData = { assistants: [], activities: [] }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))

export default function Publish() {
  const { data, reload } = useLoad<PubData>(
    async () => {
      const res = (await fetchPublisher()) as Rec
      const inner: Rec = (res?.data && !Array.isArray(res.data) && typeof res.data === 'object')
        ? (res.data as Rec)
        : {}
      return {
        assistants: asArray<Rec>(inner.data ?? inner.assistants ?? inner.list ?? (Array.isArray(res.data) ? res.data : (res.list ?? res))),
        activities: asArray<Rec>(inner.list ?? inner.activities ?? inner.records ?? res.list ?? []),
      }
    },
    [],
    FALLBACK,
  )

  const [adding, setAdding] = useState(false)
  const [newUid, setNewUid] = useState('')

  const addUser = async () => {
    const uid = newUid.trim()
    if (!uid) {
      return
    }
    showNotify(i18nT('Submitting...'), 'succ')
    try {
      await operatePublisher({ uid, type: 'add' })
      setAdding(false)
      setNewUid('')
      reload()
    } catch {
      showNotify('Permission denied', 'err')
    }
  }

  const removeUser = async (uid: string) => {
    try {
      await operatePublisher({ uid, type: 'del' })
      reload()
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  return (
    <Shell variant="wide" title="Publisher" css={['user.css']} contCls="">
      <div className="g_rblock pub_page">
        <p className="title">Assistant list</p>
        <div className="pub_list">
          {data.assistants.map((item: Rec, i: number) => {
            const a: Rec = (item.assistant ?? item) as Rec
            const uid = s(a.id ?? item.uid ?? item.user_id)
            return (
              <div className="item" data-uid={uid} key={i}>
                <a href={URLS.user(uid)}>{s(a.username)}</a>
                <span> Last activity: {s(item.last_time_str ?? item.last_time)}</span>
                <span className="del" onClick={() => void removeUser(uid)}>Remove</span>
              </div>
            )
          })}
        </div>
        <div className="pub_oper">
          <a href="#" className="btn g_btn" data-type="add" onClick={(e) => { e.preventDefault(); setAdding(true) }}>{i18nT('Add')}</a>
          {adding && (
            <span className="pub_add">
              <input type="text" name="uid" value={newUid} placeholder="user id" onChange={(e: ChangeEvent<HTMLInputElement>) => setNewUid(e.target.value)} />
              <span className="btn g_btn" onClick={() => void addUser()}>{i18nT('Confirm')}</span>
              <span className="btn g_btn" onClick={() => { setAdding(false); setNewUid('') }}>{i18nT('Cancel')}</span>
            </span>
          )}
        </div>

        <p className="title" style={{ marginTop: '32px' }}>Activities</p>
        <div className="pub_list">
          {data.activities.map((item: Rec, i: number) => {
            const u: Rec = (item.user_beta ?? item.user ?? item) as Rec
            const c: Rec = (item.chart ?? {}) as Rec
            const song: Rec = (c.song ?? {}) as Rec
            const cid = s(c.id ?? item.chart_id)
            return (
              <div className="item" key={i}>
                <a href={URLS.user(u.id ?? item.user_id ?? 0)}>{s(u.username)}</a>
                {' Mark Beta:'}
                <a href={URLS.chartPage(cid)}>{s(song.title)} - {s(c.version)}</a>
                <span>{s(item.time_now ?? item.time_str)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}
