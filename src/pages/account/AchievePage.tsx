import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { asArray } from '../../utils/data'
import { LoadingBlock } from '../../components/fragments'
import { useLoad } from '../../lib/useLoad'
import { URLS } from '../../lib/urls'
import { fetchAchieveList } from '../../network/pageAccount'
import { t as i18nT } from '../../i18n'
import './AchievePage.css'
import type { AnyRec as Rec } from '../../utils/data'


export default function AchievePage() {
  const params = useParams<{ uid?: string }>()
  const uid = params.uid
    ?? new URLSearchParams(window.location.search).get('uid')
    ?? '0'

  const { data, loading } = useLoad<Rec[]>(
    async () => {
      const resp: any = await fetchAchieveList(uid)
      const d: Rec = (resp?.data ?? resp ?? {}) as Rec
      return asArray<Rec>(d.list ?? d.achievements ?? d)
    },
    [uid],
    [],
  )

  return (
    <Shell page="achieve" variant="wide" title={i18nT('Collection')} css={[]}>
      <div className="g_title">{i18nT('Collection')}</div>
      <div className="g_cont">
        <div className="g_actbar">
          <a href={URLS.user(uid)} className="g_btn">{i18nT('Back')}</a>
        </div>
        <h1>Achievement</h1>
        {data.length === 0 ? (
          <h2>Nothing</h2>
        ) : (
          <div className="achi">
            {data.map((item: Rec, i: number) => {
              const a: Rec = (item.achieve ?? item) as Rec
              const name = String(a.name ?? item.name ?? '')
              const cover = String(a.cover ?? item.cover ?? '')
              return (
                <div className="item g_round" key={i} data-id={String(item.id ?? a.id ?? '')}>
                  <img src={cover} alt={name} />
                  <span className="textfix">{name}</span>
                </div>
              )
            })}
          </div>
        )}
        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
