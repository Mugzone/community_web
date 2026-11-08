import { useState } from 'react'
import { Shell } from '../../components/Layout'
import { asArray, EmptyBlock, LoadingBlock, num, useLoad } from '../../lib/legacy'
import { staticUrl, URLS } from '../../lib/urls'
import { fetchSkinList } from '../../network/legacy'
import { avatarUidUrl } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'
import './SkinList.css'

/** const_json.MODE_BITS / PLATFORM_BITS 的英文原文（lib/enum.py） */
const MODE_LABELS = ['Key', 'Step', 'DJ', 'Catch', 'Pad', 'Taiko', 'Ring', 'Slide', 'Live', 'Cube']
const PLATFORM_LABELS = ['PC', i18nT('Pad Horizontal'), i18nT('Pad Portrait'), i18nT('Phone Horizontal'), i18nT('Phone Portrait')]

/** all_skins.html #mode_list：data-id 为位值，图片为 mode-<index>.png */
const MODE_OPTIONS: { bit: number; img: number }[] = [
  { bit: 1, img: 0 }, { bit: 8, img: 3 }, { bit: 16, img: 4 }, { bit: 32, img: 5 },
  { bit: 64, img: 6 }, { bit: 128, img: 7 }, { bit: 256, img: 8 }, { bit: 512, img: 9 },
]
/** all_skins.html #plat_list：PLATFORM_BITS 顺序，图片为 plat-<forloop.counter0>.png */
const PLATFORM_OPTIONS: { bit: number; img: number; label: string }[] = [
  { bit: 1, img: 0, label: 'PC' },
  { bit: 2, img: 1, label: i18nT('Pad Horizontal') },
  { bit: 4, img: 2, label: i18nT('Pad Portrait') },
  { bit: 8, img: 3, label: i18nT('Phone Horizontal') },
  { bit: 16, img: 4, label: i18nT('Phone Portrait') },
]

type SkinRow = {
  id: number | string
  name?: string
  price?: number | string
  sales?: number | string
  mav?: boolean
  modes?: number[]
  platforms?: number[]
  author_id?: number | string
  author_name?: string
  avatar?: string
  bought_at?: string
}

type SkinListData = { skins: SkinRow[]; total: number }

type Query = {
  mode: number
  platform: number
  status: number
  creator: string
  keyword: string
  page: number
}

const readQuery = (): Query => {
  const p = new URLSearchParams(window.location.search)
  return {
    mode: num(p.get('mode'), 0),
    platform: num(p.get('platform'), 0),
    status: p.has('status') ? num(p.get('status'), 2) : 2,
    creator: p.get('author') ?? '',
    keyword: p.get('kw') ?? '',
    page: num(p.get('page'), 1),
  }
}

export default function SkinList() {
  const initial = readQuery()
  const showBuy = num(new URLSearchParams(window.location.search).get('show_buy'), 0) === 1
  const [mode, setMode] = useState(initial.mode)
  const [platform, setPlatform] = useState(initial.platform)
  const [status, setStatus] = useState(initial.status)
  const [creator, setCreator] = useState(initial.creator)
  const [keyword, setKeyword] = useState(initial.keyword)
  const [query, setQuery] = useState<Query>(initial)

  const { data, loading, error } = useLoad<SkinListData>(
    async () => {
      const resp = await fetchSkinList({
        mode: query.mode || undefined,
        platform: query.platform || undefined,
        status: query.status,
        author: query.creator || undefined,
        kw: query.keyword || undefined,
        page: query.page,
        show_buy: showBuy ? 1 : undefined,
      })
      const d: any = resp?.data ?? resp ?? {}
      const skins = asArray<SkinRow>(d?.skins ?? d?.list ?? d)
      const total = num(d?.total, 0)
      return { skins, total: Math.max(1, Math.ceil(total / 20) || 1, query.page) }
    },
    [query.mode, query.platform, query.status, query.creator, query.keyword, query.page, showBuy],
    { skins: [] as SkinRow[], total: 1 },
  )

  const total = data.total
  const pages: number[] = []
  if (total > 1) {
    const start = Math.max(1, query.page - 3)
    for (let i = start; i < query.page; i++) pages.push(i)
    pages.push(query.page)
    for (let i = query.page + 1; i <= total; i++) pages.push(i)
  }

  const onSearch = () => {
    setQuery({ mode, platform, status, creator, keyword, page: 1 })
  }

  return (
    <Shell page="skinlist"
      variant="two-col"
      title="Skins"
      css={['board.css']}
      contCls={showBuy ? 'show-buy' : ''}
    >
      <div className="g_cont2">
        <div id="option" style={showBuy ? { display: 'none' } : undefined}>
          <div>
            <span className="g_round">{i18nT('Mode')}</span>
            <div className="g_select icon-list icon-list1" id="mode_list">
              {MODE_OPTIONS.map((o) => (
                <span
                  key={o.bit}
                  data-id={o.bit}
                  className={(mode & o.bit) !== 0 ? 'curr' : undefined}
                  onClick={() => { setMode((prev) => prev ^ o.bit) }}
                >
                  <img src={staticUrl(`img/mode/mode-${o.img}.png`)} alt="" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="g_round">{i18nT('Platform')}</span>
            <div className="g_select icon-list" id="plat_list">
              {PLATFORM_OPTIONS.map((o) => (
                <span
                  key={o.bit}
                  data-id={o.bit}
                  className={(platform & o.bit) !== 0 ? 'curr' : undefined}
                  onClick={() => { setPlatform((prev) => prev ^ o.bit) }}
                >
                  <img src={staticUrl(`img/platform/plat-${o.img}.png`)} title={o.label} alt="" />
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="g_round">{i18nT('Status')}</span>
            <div className="g_select icon-list" id="status_list">
              <span className={`radio${status === 2 ? ' curr' : ''}`} data-id="2" onClick={() => { setStatus(2) }}>Stable</span>
              <span className={`radio${status === 1 ? ' curr' : ''}`} data-id="1" onClick={() => { setStatus(1) }}>Beta</span>
              <span className={`radio${status === 0 ? ' curr' : ''}`} data-id="0" onClick={() => { setStatus(0) }}>{i18nT('All')}</span>
            </div>
          </div>
          <div style={{ display: 'none' }}>
            <span className="g_round">{i18nT('Creator')}</span>
            <input id="cl_creator" className="g_round filter-input" value={creator} onChange={(e) => setCreator(e.target.value)} />
          </div>
          <div style={{ display: 'none' }}>
            <span className="g_round">{i18nT('Keywords')}</span>
            <input id="cl_key" className="g_round filter-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div id="head_btns">
            <a id="cl_search" className="g_btn fl" onClick={onSearch}><i></i>{i18nT('Search')}</a>
            <a id="cl_submit" href="/store/skin/entry" className="g_btn fr"><i></i>{i18nT('Submit my skin')}</a>
            <a id="cl_help" href="/wiki/1936" className="g_btn fr"><i></i>{i18nT('How to use')}</a>
          </div>
        </div>
        {showBuy && <p id="buy_hint" style={{ textAlign: 'left' }}>You have bought these skins:</p>}
        <div id="skin_table">
          <ul id="skins">
            {loading && <LoadingBlock />}
            {!loading && error && data.skins.length === 0 && <EmptyBlock />}
            {data.skins.map((item) => (
              <div className="item2" key={item.id}>
                <div className="num">{item.sales ?? ''}</div>
                <a href={URLS.skinDetail(item.id)} className="skin-name textfix title">
                  {!item.price && <i className="top">free</i>}
                  {item.mav && <i className="mav">MalodyV</i>}
                  <span className="textfix">{item.name ?? ''}</span>
                </a>
                <div className="name">
                  <div id={`avatar_${item.id}`}>
                    {/* 老站 skinstore.py:155 format_avatar(item.author, 36, "avatar")：36px 上限 + !avatar64 缩略图；
                        skinlist.css 里 #skins span 行高只有 48px，不能塞原始尺寸大图 */}
                    <img
                      className="avatar"
                      src={item.author_id ? avatarUidUrl(num(item.author_id, 0), 36) : '/static/img/avatar.png'}
                      style={{ maxWidth: 36, maxHeight: 36 }}
                      alt=""
                    />
                  </div>
                  <a className="textfix" href={URLS.user(item.author_id ?? '')}>{item.author_name ?? ''}</a>
                </div>
                <div className="mode-icons">
                  {showBuy
                    ? (item.bought_at ?? '')
                    : (item.modes ?? []).map((m) => (
                      <img className="icon" key={m} src={staticUrl(`img/mode/mode-${m}.png`)} title={MODE_LABELS[m] ?? ''} alt="" />
                    ))}
                </div>
                <div className="plat-icons">
                  {showBuy
                    ? (item.price ?? '')
                    : (item.platforms ?? []).map((p) => (
                      <img className="icon" key={p} src={staticUrl(`img/platform/plat-${p}.png`)} title={PLATFORM_LABELS[p] ?? ''} alt="" />
                    ))}
                </div>
              </div>
            ))}
          </ul>
          <span className="justfix"></span>
          <div className="g_memo" id="no_skin_hint" style={{ display: !loading && data.skins.length === 0 ? 'block' : 'none' }}>
            <span className="g_round">No skin found for given conditions</span>
          </div>
          <div id="pager" style={{ display: total <= 1 ? 'none' : undefined }}>
            {pages.map((p) => (
              <span
                key={p}
                className={`pager-btn${p === query.page ? ' curr' : ''}`}
                onClick={() => { setQuery((q) => ({ ...q, page: p })) }}
              >{p}</span>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
