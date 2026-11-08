import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { asArray, LoadingBlock, useLoad } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchAchieveList } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

/* list/achieve.html：个人主页成就区「查看全部」的落地页。
 * 老站还有 Puzzle 拼图区，数据来自 player_evt；Go 的 /account/achieve/list
 * 只返回 user_achievement，因此这里只复刻 Achievement 区块。 */
type Rec = Record<string, any>

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
    <Shell variant="wide" title={i18nT('Collection')} css={['achieve.css']}>
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
