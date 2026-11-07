import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { asArray, JustifyRow, num, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { getJson } from '../../network/api'
import { avatarUrl } from '../../utils/formatters'

/* all_friends.html：extended base.html（两栏），默认侧栏 widget/default_side.html */
type Rec = Record<string, any>
type FriendData = { items: Rec[]; total: number }
const FALLBACK: FriendData = { items: [], total: 1 }

const s = (v: unknown, fb = ''): string => (v === undefined || v === null ? fb : String(v))

export default function FriendList() {
  const { session } = useSession()
  const [page, setPage] = useState(1)

  const { data } = useLoad<FriendData>(
    async () => {
      const res = (await getJson<Rec>('/account/friend/list', { params: { page } })) as Rec
      const d: Rec = (res ?? {}) as Rec
      return {
        items: asArray<Rec>(d.data ?? d.list ?? d.items ?? res),
        total: Math.max(1, num(d.total ?? d.pages, 1)),
      }
    },
    [page],
    FALLBACK,
  )

  const go = (p: number) => {
    if (p < 1 || p > data.total) return
    setPage(p)
  }

  return (
    <Shell variant="two-col" title="My friends" css={['akari.css']} contCls="" sidebar={<DefaultSidebar />}>
      <div className="g_title">My Friends</div>
      <div className="g_cont all_friends">
        <div className="g_actbar">
          <a href={URLS.user(session?.uid ?? 0)} className="g_btn">Back</a>
        </div>
        <JustifyRow>
          {data.items.map((item: Rec, i: number) => {
            const u: Rec = (item.to_user ?? item.user ?? item) as Rec
            const uid = u.id ?? item.user_id ?? item.uid ?? 0
            return (
              <div className="item g_round" key={i}>
                <img className="g_round" src={avatarUrl(u.avatar, uid)} alt={s(u.username)} />
                <a className="textfix" href={URLS.user(uid)}>{s(u.username)}</a>
              </div>
            )
          })}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i: number) => (
            <div className="item justfyHold" key={`b${i}`}></div>
          ))}
          <span className="justfix"></span>
        </JustifyRow>
        {data.total > 1 && (
          <div className="g_more">
            {page > 1 ? (
              <a href="#" className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); go(page - 1) }}>Prev</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{page}/{data.total}</span>
            {page < data.total ? (
              <a href="#" className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); go(page + 1) }}>Next</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
