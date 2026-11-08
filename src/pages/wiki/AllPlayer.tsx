import { Fragment, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, LoadingBlock, EmptyBlock, floatFormat } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchGlobalRank } from '../../network/api'
import { avatarUrl } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'
import './AllPlayer.css'

type PlayerItem = {
  uid?: number | string
  user_id?: number | string
  user?: { id?: number | string; username?: string }
  username?: string
  avatar?: string
  rank?: number
  level?: number | string
  exp?: number | string
  value?: number | string
  acc?: number | string
  playcount?: number | string
  combo?: number | string
}
const MODES = [0, 3, 4, 5, 6, 7, 8, 9]
const FALLBACK: PlayerItem[] = []

const txt = (v: unknown): string => (v === undefined || v === null ? '' : String(v))
const uidOf = (it: PlayerItem): number | string => it.uid ?? it.user_id ?? it.user?.id ?? 0
const nameOf = (it: PlayerItem): string => it.username ?? it.user?.username ?? ''
const expOf = (it: PlayerItem): number | string => it.exp ?? it.value ?? ''

/** /page/all/player —— 老站 all_player.html（玩家排行） */
export default function AllPlayer() {
  const [mode, setMode] = useState(0)
  const [from] = useState(0)

  // fetchGlobalRank 返回 RespGlobalRank（data 为玩家数组），收敛成数组兜底。
  const { data, loading } = useLoad<PlayerItem[]>(
    async () => {
      const resp: any = await fetchGlobalRank({ mode, from })
      return asArray<PlayerItem>(resp?.data ?? resp)
    },
    [mode, from],
    FALLBACK,
  )

  const items = data ?? []

  const pickMode = (m: number) => {
    setMode(m)
  }

  const renderTop = (it: PlayerItem, rank: number) => (
    <div className="item-top g_round">
      {/* 老站 rank_item_top.html:5 {% avatar item.user 90 %}：后端只给短文件名，需拼 CDN + !avatar128 */}
      <span className="avatar"><img src={avatarUrl(it.avatar, uidOf(it), 90)} style={{ maxWidth: 90, maxHeight: 90 }} alt="" /></span>
      <i className={`label top-${rank}`}></i>
      <div className="right">
        <span className="name textfix"><a href={URLS.user(uidOf(it))}>{nameOf(it)}</a></span>
        <span className="lv textfix">Lv.{floatFormat(it.level, 0)} - {txt(expOf(it))}</span>
        <span className="acc">Acc:{floatFormat(it.acc)}%</span>
        <span className="combo">Combo:{txt(it.combo)}</span>
        <span className="pc textfix">Playcount:{txt(it.playcount)}</span>
      </div>
    </div>
  )

  const renderRow = (it: PlayerItem, rank: number) => (
    <div className="item">
      <span className="rank">{rank}</span>
      {/* 老站 rank_item.html:6 {% avatar item.user 48 small=True %}：!avatar64 + 内联 48px */}
      <span className="avatar"><img src={avatarUrl(it.avatar, uidOf(it), 48)} style={{ maxWidth: 48, maxHeight: 48 }} alt="" /></span>
      <span className="name textfix"><a href={URLS.user(uidOf(it))}>{nameOf(it)}</a></span>
      <span className="lv">{floatFormat(it.level, 0)}</span>
      <span className="exp">{txt(expOf(it))}</span>
      <span className="acc">{floatFormat(it.acc)}%</span>
      <span className="pc">{txt(it.playcount)}</span>
      <span className="combo">{txt(it.combo)}</span>
    </div>
  )

  return (
    <Shell page="player"
      variant="wide"
      title="Player ranking"
      css={[]}
      sidebar={<DefaultSidebar />}
    >
      <div className="g_cont2 g_rblock all_chart">
        <div className="mode">
          {MODES.map((m) => (
            <a
              key={m}
              href={`${URLS.player}?from=${from}&mode=${m}`}
              className={mode === m ? 'curr' : undefined}
              onClick={(e) => { e.preventDefault(); pickMode(m) }}
            >
              <img src={staticUrl(`img/mode/mode-${m}.png`)} alt="" />
            </a>
          ))}
        </div>
        <div className="list">
          {items.map((it, idx) => {
            const rank = idx + 1
            return (
              <Fragment key={idx}>
                {rank === 4 && <span className="clear"></span>}
                {rank === 4 && (
                  <div className="list_head">
                    <span className="rank">{i18nT('Rank')}</span>
                    <span className="avatar"></span>
                    <span className="name">{i18nT('Player')}</span>
                    <span className="lv">{i18nT('Level')}</span>
                    <span className="exp">{i18nT('Exp')}</span>
                    <span className="acc">{i18nT('Acc.')}</span>
                    <span className="pc">{i18nT('Play Count')}</span>
                    <span className="combo">{i18nT('Combo')}</span>
                  </div>
                )}
                {rank <= 3 ? renderTop(it, rank) : renderRow(it, rank)}
              </Fragment>
            )
          })}
        </div>
        {loading && <LoadingBlock />}
        {!loading && items.length === 0 && <EmptyBlock />}
      </div>
    </Shell>
  )
}
