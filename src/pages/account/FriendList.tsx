import { useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { JustifyRow } from '../../components/fragments'
import { useLoad } from '../../lib/useLoad'
import { URLS } from '../../lib/urls'
import { getJson } from '../../network/api'
import { avatarUrl } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'
import { asString as s, asArray, num } from '../../utils/data'
import type { AnyRec as Rec } from '../../utils/data'

type FriendData = { items: Rec[]; next: number; hasMore: boolean }
const FALLBACK: FriendData = { items: [], next: 0, hasMore: false }


export default function FriendList() {
  const { session } = useSession()
  const [cursors, setCursors] = useState<number[]>([0])
  const from = cursors[cursors.length - 1]
  const page = cursors.length

  const { data } = useLoad<FriendData>(
    async () => {
      const res = (await getJson<Rec>('/player/friend', { params: { from } })) as Rec
      const d: Rec = (res ?? {}) as Rec
      return {
        items: asArray<Rec>(d.data ?? d.list ?? d.items ?? res),
        next: num(d.next, 0),
        hasMore: Boolean(d.hasMore),
      }
    },
    [from],
    FALLBACK,
  )

  const goNext = () => {
    if (data.hasMore && data.next > 0) setCursors((c) => [...c, data.next])
  }
  const goPrev = () => {
    if (cursors.length > 1) setCursors((c) => c.slice(0, -1))
  }
  const total = data.hasMore ? page + 1 : page

  return (
    <Shell variant="two-col" title="My friends" css={['akari.css']} contCls="" sidebar={<DefaultSidebar />}>
      <div className="g_title">{i18nT('My Friends')}</div>
      <div className="g_cont all_friends">
        <div className="g_actbar">
          <a href={URLS.user(session?.uid ?? 0)} className="g_btn">{i18nT('Back')}</a>
        </div>
        <JustifyRow>
          {data.items.map((item: Rec, i: number) => {
            const u: Rec = (item.user ?? item.to_user ?? item) as Rec
            const uid = item.uid ?? item.user_id ?? u.id ?? 0
            const name = s(u.username ?? item.username)
            return (
              <div className="item g_round" key={`${uid}-${i}`}>
                <img className="g_round" src={avatarUrl(u.avatar, uid)} alt={name} />
                <a className="textfix" href={URLS.user(uid)}>{name}</a>
              </div>
            )
          })}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i: number) => (
            <div className="item justfyHold" key={`b${i}`}></div>
          ))}
          <span className="justfix"></span>
        </JustifyRow>
        {total > 1 && (
          <div className="g_more">
            {page > 1 ? (
              <a href="#" className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goPrev() }}>{i18nT('Prev')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
            <span>{page}/{total}</span>
            {data.hasMore ? (
              <a href="#" className="g_round" data-type="back" onClick={(e) => { e.preventDefault(); goNext() }}>{i18nT('Next')}</a>
            ) : (
              <a className="fake" href="#"></a>
            )}
          </div>
        )}
      </div>
    </Shell>
  )
}
