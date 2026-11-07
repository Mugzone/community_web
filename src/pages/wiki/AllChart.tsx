import { useState, type KeyboardEvent } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, num } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchChartFilter } from '../../network/legacy'
import { t as i18nT } from '../../i18n'
import { coverUrl } from '../../utils/formatters'
import { SkeletonCards } from '../../components/Skeleton'

type SelectOption = { id: number; label?: string }
type ChartItem = { id: number | string; cover?: string; title?: string; version?: string; mode?: number; lastedit?: number }
type Model = { items: ChartItem[]; total: number }
const FALLBACK: Model = { items: [], total: 1 }

const MODE_OPTIONS: SelectOption[] = [
  { id: -1, label: i18nT('All') },
  { id: 0 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 },
]
const STATUS_OPTIONS: SelectOption[] = [
  { id: 3, label: i18nT('All') }, { id: 2, label: 'Stable' }, { id: 1, label: 'Beta' }, { id: 0, label: 'Alpha' },
]
const FREE_OPTIONS: SelectOption[] = [
  { id: 0, label: 'Exclude' }, { id: 1, label: 'Include' },
]

/**
 * 老站 list.py:all_chart(uid) 把 uid 换成 username 放进 conf["creator"]，
 * all_chart.html 再预填到 #cl_creator。个人主页「显示全部」用 ?keyword=<用户名>
 * 把作者名带过来，这里按同样语义转成「作者筛选」——Go 的 keyword 参数是按
 * version / 曲名 / artist 模糊搜，直接当 keyword 用会搜不到该用户创作的谱面。
 */
const initialCreatorFromUrl = (): string => {
  const q = new URLSearchParams(window.location.search)
  return q.get('creator') ?? q.get('keyword') ?? ''
}
/** 显式的关键词搜索仍可用 ?key= 预填（与老站 #cl_key 对应） */
const initialKeywordFromUrl = (): string =>
  new URLSearchParams(window.location.search).get('key') ?? ''

/** /page/all/chart —— 老站 all_chart.html + module/chartlist（筛选 + 分页） */
export default function AllChart() {
  const [mode, setMode] = useState(0)
  const [status, setStatus] = useState(2)
  const [free, setFree] = useState(0)
  const [page, setPage] = useState(0)
  const [creatorInput, setCreatorInput] = useState(initialCreatorFromUrl)
  const [keywordInput, setKeywordInput] = useState(initialKeywordFromUrl)
  const [creator, setCreator] = useState(initialCreatorFromUrl)
  const [keyword, setKeyword] = useState(initialKeywordFromUrl)
  const [tag] = useState(() => {
    const raw = new URLSearchParams(window.location.search).get('tag')
    const n = raw === null ? 0 : Number(raw)
    return Number.isFinite(n) ? n : 0
  })

  const { data, loading, reload } = useLoad<Model>(
    async () => {
      const resp: any = await fetchChartFilter({
        mode, status, free, creator, keyword, page, count: 18, sort: 0, tag,
      })
      const p: any = resp?.data ?? resp
      return {
        items: asArray<ChartItem>(p?.list ?? p?.items ?? p),
        total: num(p?.total, 1),
      }
    },
    [mode, status, free, page, creator, keyword],
    FALLBACK,
  )

  const items = data.items ?? []
  const total = data.total || 1

  const onSelect = (key: 'mode' | 'status' | 'free', value: number) => {
    if (key === 'mode') setMode(value)
    else if (key === 'status') setStatus(value)
    else setFree(value)
    setPage(0)
  }

  const applySearch = () => {
    setCreator(creatorInput.trim())
    setKeyword(keywordInput.trim())
    setPage(0)
    reload()
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applySearch()
  }

  const toPage = (p: number) => {
    if (p < 0 || p >= total) return
    setPage(p)
  }

  const renderSelect = (
    key: 'mode' | 'status' | 'free',
    options: SelectOption[],
    current: number,
    extraCls = '',
    withImg = false,
  ) => (
    <div className={`g_select${extraCls ? ` ${extraCls}` : ''}`} data-key={key}>
      {options.map((o) => (
        <span
          key={o.id}
          data-id={o.id}
          className={current === o.id ? 'curr' : undefined}
          onClick={() => onSelect(key, o.id)}
        >
          {o.label !== undefined
            ? o.label
            : withImg
              ? <img src={staticUrl(`img/mode/mode-${o.id}.png`)} alt="" />
              : null}
        </span>
      ))}
    </div>
  )

  /* all_chart.html extends base.html，sidebar block 为空，老站此页无侧栏内容 */
  return (
    <Shell
      variant="two-col"
      title="Charts"
      css={['chartlist.css']}
    >
      <div className="g_title">{i18nT('Chart')}</div>
      <div className="g_cont">
        <div id="option">
          <div>
            <span className="g_round">{i18nT('Mode')}</span>
            {renderSelect('mode', MODE_OPTIONS, mode, 'sel_mode', true)}
          </div>
          <div>
            <span className="g_round">{i18nT('Status')}</span>
            {renderSelect('status', STATUS_OPTIONS, status)}
          </div>
          <div>
            <span className="g_round">Free Mode</span>
            {renderSelect('free', FREE_OPTIONS, free)}
          </div>
          <div>
            <span className="g_round">{i18nT('Creator')}</span>
            <input
              id="cl_creator"
              className="g_round"
              autoComplete="off"
              value={creatorInput}
              onChange={(e) => setCreatorInput(e.target.value)}
              onKeyDown={onEnter}
            />
          </div>
          <div>
            <span className="g_round">{i18nT('Keywords')}</span>
            <input
              id="cl_key"
              className="g_round"
              autoComplete="off"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={onEnter}
            />
            <a id="cl_search" className="g_btn" href="#" onClick={(e) => { e.preventDefault(); applySearch() }}>{i18nT('Search')}</a>
          </div>
        </div>
        <div id="maps">
          {loading && <SkeletonCards count={12} />}
          {!loading && items.map((it) => (
            <div className="g_map" key={it.id}>
              <a className="link" href={URLS.chartPage(it.id)} target="_blank">
                {it.cover
                  ? <div className="cover g_cover" style={{ backgroundImage: `url(${coverUrl(it.cover)})` }}></div>
                  : <div className="cover"></div>}
                <img className="mode" src={staticUrl(`img/mode/mode-${it.mode}.png`)} alt="" />
                <div className="meta">
                  <p className="title textfix">{it.title}</p>
                  <p className="version textfix">{it.version}</p>
                </div>
              </a>
            </div>
          ))}
          <span className="justfix"></span>
        </div>
        {/* 老站 self.pager.show() 移除内联 display，交回 .g_pager 的 inline-block；写死 block 会拉成一整行 */}
        <div
          className="g_more g_pager"
          style={!loading && items.length > 0 ? undefined : { display: 'none' }}
        >
          <a href="#" className="prev" onClick={(e) => { e.preventDefault(); toPage(page - 1) }}>&lt;</a>
          <span onClick={() => {
            const raw = window.prompt('Select page', String(page + 1))
            if (raw === null) return
            const target = parseInt(raw, 10) - 1
            if (!Number.isNaN(target)) toPage(target)
          }}>{page + 1}/{total}</span>
          <a href="#" className="next" onClick={(e) => { e.preventDefault(); toPage(page + 1) }}>&gt;</a>
        </div>
        <div className="g_memo" style={{ display: !loading && items.length === 0 && page === 0 ? 'block' : 'none' }}>
          <span className="g_round">{i18nT('No more charts')}</span>
        </div>
      </div>
    </Shell>
  )
}
