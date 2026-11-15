import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad } from '../../lib/useLoad'
import { asArray, num } from '../../utils/data'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchChartFilter } from '../../network/pageWeb'
import { t as i18nT } from '../../i18n'
import { coverUrl, modeLabel } from '../../utils/formatters'
import { SkeletonCards } from '../../components/Skeleton'
import RangeSlider from '../../components/RangeSlider'
import './AllChart.css'

type ChartItem = {
  id: number | string
  cover?: string
  title?: string
  artist?: string
  username?: string
  version?: string
  mode?: number
  lastedit?: number
  level?: number
  bpm?: number
  length?: number
  type?: number
}

type Model = { items: ChartItem[]; pages: number; total: number }
const FALLBACK: Model = { items: [], pages: 1, total: 0 }

type Filters = {
  mode: number
  statuses: number[]
  free: number
  keyword: string
  creator: string
  levelMin: string
  levelMax: string
  bpmMin: string
  bpmMax: string
  lengthMin: string
  lengthMax: string
  sort: string
  order: string
}

const MODES = [-1, 0, 3, 4, 5, 6, 7, 8, 9]
const STATUSES = [2, 1, 0]
const STATUS_KEYS: Record<number, string> = { 2: 'Stable', 1: 'Beta', 0: 'Alpha' }
const FREE_OPTIONS = [
  { value: 0, label: 'Normal' },
  { value: -1, label: 'All' },
  { value: 2, label: 'Freestyle only' },
]
const SORT_OPTIONS = [
  { value: 'time', label: 'Latest' },
  { value: 'hot', label: 'Most played' },
  { value: 'level', label: 'Level' },
]
const ORDER_OPTIONS = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
]
const MANAGED_PARAMS = new Set([
  'mode', 'type', 'status', 'free', 'word', 'key', 'keyword', 'uid', 'creator', 'tag',
  'lvmin', 'lvmax', 'bpmmin', 'bpmmax', 'lenmin', 'lenmax', 'sort', 'order', 'page',
])

const DEFAULT: Filters = {
  mode: 0,
  statuses: [2],
  free: 0,
  keyword: '',
  creator: '',
  levelMin: '',
  levelMax: '',
  bpmMin: '',
  bpmMax: '',
  lengthMin: '',
  lengthMax: '',
  sort: 'time',
  order: 'desc',
}

const readSearch = () => typeof window === 'undefined' ? '' : window.location.search ?? ''

const readNumber = (q: URLSearchParams, key: string, fallback: number) => {
  const raw = q.get(key)
  if (raw === null || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

const readStatuses = (q: URLSearchParams): number[] => {
  const raw = q.get('type') ?? q.get('status')
  if (raw === null || raw === '') return DEFAULT.statuses
  const parts = raw.split(',').map((v) => v.trim())
  if (parts.includes('3')) return DEFAULT.statuses
  const parsed = Array.from(new Set(parts.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 2)))
  if (!parsed.length || parsed.length >= STATUSES.length) return DEFAULT.statuses
  return parsed
}

const parseFilters = (search: string): Filters => {
  const q = new URLSearchParams(search)
  const freeRaw = q.get('free')
  return {
    mode: readNumber(q, 'mode', DEFAULT.mode),
    statuses: readStatuses(q),
    free: freeRaw === '1' ? -1 : readNumber(q, 'free', DEFAULT.free),
    keyword: q.get('word') ?? q.get('key') ?? '',
    creator: q.get('creator') ?? q.get('keyword') ?? q.get('uid') ?? '',
    levelMin: q.get('lvmin') ?? '',
    levelMax: q.get('lvmax') ?? '',
    bpmMin: q.get('bpmmin') ?? '',
    bpmMax: q.get('bpmmax') ?? '',
    lengthMin: q.get('lenmin') ?? '',
    lengthMax: q.get('lenmax') ?? '',
    sort: q.get('sort') ?? DEFAULT.sort,
    order: q.get('order') ?? DEFAULT.order,
  }
}

const parseTag = (search: string): number => {
  const raw = new URLSearchParams(search).get('tag')
  const value = raw === null ? 0 : Number(raw)
  return Number.isFinite(value) ? Math.trunc(value) : 0
}

const bounded = (value: string, min: number, max: number) => {
  if (value.trim() === '') return ''
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  return String(Math.round(Math.max(min, Math.min(max, parsed))))
}

const rangePair = (low: string, high: string, min: number, max: number): [string, string] => {
  const lo = bounded(low, min, max)
  const hi = bounded(high, min, max)
  if (lo === '' || hi === '' || Number(lo) <= Number(hi)) return [lo, hi]
  return [hi, lo]
}

const normalized = (f: Filters): Filters => {
  const levels = rangePair(f.levelMin, f.levelMax, 1, 40)
  const bpms = rangePair(f.bpmMin, f.bpmMax, 100, 300)
  const lengths = rangePair(f.lengthMin, f.lengthMax, 60, 400)
  const statuses = Array.from(new Set(f.statuses.filter((s) => STATUSES.includes(s))))
  return {
    ...f,
    mode: MODES.includes(f.mode) ? f.mode : DEFAULT.mode,
    free: FREE_OPTIONS.some((o) => o.value === f.free) ? f.free : DEFAULT.free,
    statuses: statuses.length ? statuses : DEFAULT.statuses,
    keyword: f.keyword.trim(),
    creator: f.creator.trim(),
    levelMin: levels[0],
    levelMax: levels[1],
    bpmMin: bpms[0],
    bpmMax: bpms[1],
    lengthMin: lengths[0],
    lengthMax: lengths[1],
    sort: SORT_OPTIONS.some((o) => o.value === f.sort) ? f.sort : DEFAULT.sort,
    order: ORDER_OPTIONS.some((o) => o.value === f.order) ? f.order : DEFAULT.order,
  }
}

const buildParams = (f: Filters, page: number, tag: number) => {
  const params: Record<string, string | number> = {
    mode: f.mode,
    status: f.statuses.length === 3 ? 3 : f.statuses.join(','),
    free: f.free,
    creator: f.creator,
    keyword: f.keyword,
    page,
    count: 18,
    sort: f.sort,
    order: f.order,
  }
  if (tag > 0) params.tag = tag
  const ranges: [string, string][] = [
    ['lvmin', f.levelMin], ['lvmax', f.levelMax],
    ['bpmmin', f.bpmMin], ['bpmmax', f.bpmMax],
    ['lenmin', f.lengthMin], ['lenmax', f.lengthMax],
  ]
  ranges.forEach(([key, value]) => {
    if (value !== '') params[key] = value
  })
  return params
}

const syncUrl = (f: Filters, tag: number) => {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const current = new URLSearchParams(window.location.search)
  const q = new URLSearchParams()
  current.forEach((value, key) => {
    if (!MANAGED_PARAMS.has(key)) q.set(key, value)
  })
  if (tag > 0) q.set('tag', String(tag))
  if (f.mode !== DEFAULT.mode) q.set('mode', String(f.mode))
  const statusKey = f.statuses.join(',')
  if (f.statuses.length < STATUSES.length && statusKey !== DEFAULT.statuses.join(',')) q.set('type', statusKey)
  if (f.free !== DEFAULT.free) q.set('free', String(f.free))
  if (f.keyword) q.set('word', f.keyword)
  if (f.creator) q.set('creator', f.creator)
  const pairs: [string, string][] = [
    ['lvmin', f.levelMin], ['lvmax', f.levelMax],
    ['bpmmin', f.bpmMin], ['bpmmax', f.bpmMax],
    ['lenmin', f.lengthMin], ['lenmax', f.lengthMax],
  ]
  pairs.forEach(([key, value]) => {
    if (value !== '') q.set(key, value)
  })
  if (f.sort !== DEFAULT.sort) q.set('sort', f.sort)
  if (f.order !== DEFAULT.order) q.set('order', f.order)
  const search = q.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
}

const formatLength = (seconds: number) => {
  if (seconds <= 0) return ''
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds - minutes * 60).padStart(2, '0')}`
}

export default function AllChart() {
  const location = useLocation()
  const [draft, setDraft] = useState<Filters>(() => normalized(parseFilters(readSearch())))
  const [applied, setApplied] = useState<Filters>(() => normalized(parseFilters(readSearch())))
  const [tag, setTag] = useState(() => parseTag(readSearch()))
  const [page, setPage] = useState(0)
  const urlRef = useRef(readSearch())

  const appliedKey = JSON.stringify(applied)
  const { data, loading, error, reload } = useLoad<Model>(
    async () => {
      const resp: any = await fetchChartFilter(buildParams(applied, page, tag))
      const p: any = resp?.data ?? resp
      return {
        items: asArray<ChartItem>(p?.list ?? p?.items ?? p),
        pages: num(p?.total, 1),
        total: num(resp?.total, 0),
      }
    },
    [appliedKey, page, tag],
    FALLBACK,
  )

  useEffect(() => {
    const search = location.search
    if (search === urlRef.current) return
    urlRef.current = search
    const next = normalized(parseFilters(search))
    setDraft(next)
    setApplied(next)
    setTag(parseTag(search))
    setPage(0)
  }, [location.search])

  const items = data.items ?? []
  const pages = data.pages || 1

  const setField = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const toggleStatus = (value: number) => {
    setDraft((prev) => {
      if (prev.statuses.includes(value)) {
        if (prev.statuses.length === 1) return prev
        return { ...prev, statuses: prev.statuses.filter((v) => v !== value) }
      }
      return { ...prev, statuses: [...prev.statuses, value] }
    })
  }

  const apply = (e?: FormEvent) => {
    e?.preventDefault()
    const next = normalized(draft)
    setDraft(next)
    setApplied(next)
    setPage(0)
    syncUrl(next, tag)
    urlRef.current = readSearch()
    reload()
  }

  const reset = () => {
    const base = { ...DEFAULT, statuses: [...DEFAULT.statuses] }
    setDraft(base)
    setApplied(base)
    setPage(0)
    syncUrl(base, tag)
    urlRef.current = readSearch()
    reload()
  }

  const toPage = (p: number) => {
    if (p < 0 || p >= pages) return
    setPage(p)
  }

  const resultLabel = loading
    ? i18nT('Loading')
    : error
      ? i18nT('Failed to load charts')
      : i18nT('{{count}} charts', { count: data.total })

  return (
    <Shell variant="two-col" title="Charts" page="allchart" css={['chartlist.css']}>
      <div className="g_title">{i18nT('Chart')}</div>
      <div className="g_cont">
        <form className="chart_filters" onSubmit={apply}>
          <div className="chart_filter_columns">
            <div className="chart_basic">
              <div className="chart_filter_head">
                <span className="g_round">{i18nT('Filters')}</span>
              </div>
          <label className="chart_field chart_field_full">
            <span>{i18nT('Keywords')}</span>
            <input
              type="search"
              value={draft.keyword}
              placeholder={i18nT('Song, artist, tag...')}
              autoComplete="off"
              onChange={(e) => setField('keyword', e.target.value)}
            />
          </label>
          <div className="chart_filter_grid">
            <label className="chart_field">
              <span>{i18nT('Mode')}</span>
              <select value={draft.mode} onChange={(e) => setField('mode', Number(e.target.value))}>
                {MODES.map((m) => (
                  <option key={m} value={m}>{m === -1 ? i18nT('All modes') : modeLabel(m)}</option>
                ))}
              </select>
            </label>
            <div className="chart_field">
              <span>{i18nT('Status')}</span>
              <div className="g_select chart_status">
                {STATUSES.map((s) => (
                  <span
                    key={s}
                    role="checkbox"
                    aria-checked={draft.statuses.includes(s)}
                    tabIndex={0}
                    className={draft.statuses.includes(s) ? 'curr' : undefined}
                    onClick={() => toggleStatus(s)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleStatus(s)
                      }
                    }}
                  >
                    {i18nT(STATUS_KEYS[s])}
                  </span>
                ))}
              </div>
            </div>
            <label className="chart_field">
              <span>{i18nT('Freestyle')}</span>
              <select value={draft.free} onChange={(e) => setField('free', Number(e.target.value))}>
                {FREE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{i18nT(o.label)}</option>
                ))}
              </select>
            </label>
            <label className="chart_field">
              <span>{i18nT('Creator')}</span>
              <input
                type="text"
                value={draft.creator}
                autoComplete="off"
                onChange={(e) => setField('creator', e.target.value)}
              />
            </label>
            <label className="chart_field">
              <span>{i18nT('Sort by')}</span>
              <select value={draft.sort} onChange={(e) => setField('sort', e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{i18nT(o.label)}</option>
                ))}
              </select>
            </label>
            <label className="chart_field">
              <span>{i18nT('Order')}</span>
              <select value={draft.order} onChange={(e) => setField('order', e.target.value)}>
                {ORDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{i18nT(o.label)}</option>
                ))}
              </select>
            </label>
          </div>
            </div>
            <div className="chart_advanced">
              <div className="chart_advanced_head">
                <span className="g_round">{i18nT('More filters')}</span>
              </div>
              <RangeSlider
                label={i18nT('Level range')}
                min={1}
                max={40}
                minValue={draft.levelMin}
                maxValue={draft.levelMax}
                minPlaceholder={i18nT('Min level')}
                maxPlaceholder={i18nT('Max level')}
                onMinChange={(v) => setField('levelMin', v)}
                onMaxChange={(v) => setField('levelMax', v)}
              />
              <RangeSlider
                label={i18nT('BPM range')}
                min={100}
                max={300}
                step={5}
                minValue={draft.bpmMin}
                maxValue={draft.bpmMax}
                minPlaceholder={i18nT('Min BPM')}
                maxPlaceholder={i18nT('Max BPM')}
                onMinChange={(v) => setField('bpmMin', v)}
                onMaxChange={(v) => setField('bpmMax', v)}
              />
              <RangeSlider
                label={i18nT('Length range')}
                min={60}
                max={400}
                step={10}
                minValue={draft.lengthMin}
                maxValue={draft.lengthMax}
                minPlaceholder={i18nT('Shortest (s)')}
                maxPlaceholder={i18nT('Longest (s)')}
                onMinChange={(v) => setField('lengthMin', v)}
                onMaxChange={(v) => setField('lengthMax', v)}
              />
            </div>
          </div>
          <div className="chart_actions">
            <button type="submit" className="g_btn chart_apply" disabled={loading}>
              {loading ? i18nT('Loading') : i18nT('Apply filters')}
            </button>
            <button type="button" className="g_btn chart_reset" onClick={reset} disabled={loading}>
              {i18nT('Reset')}
            </button>
          </div>
        </form>
        <div className="chart_result">
          <span className="g_round">{resultLabel}</span>
        </div>
        <div id="maps">
          {loading && <SkeletonCards count={12} />}
          {!loading && items.map((it) => {
            const level = num(it.level, 0)
            const bpm = num(it.bpm, 0)
            const seconds = num(it.length, 0)
            const lastedit = num(it.lastedit, 0)
            const versionText = it.version ?? ''
            const updated = lastedit > 0 ? new Date(lastedit * 1000).toLocaleDateString() : ''
            const extra = [
              level > 0 && !/lv\./i.test(versionText) ? i18nT('Lv.{{value}}', { value: level }) : '',
              bpm > 0 ? `${Math.round(bpm)} BPM` : '',
              formatLength(seconds),
              updated ? i18nT('Updated {{date}}', { date: updated }) : '',
            ].filter(Boolean).join(' · ')
            return (
              <div className="g_map" key={it.id}>
                <a
                  className="link"
                  href={URLS.chartPage(it.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={[it.artist, it.username].filter(Boolean).join(' · ')}
                >
                  {it.cover
                    ? <div className="cover g_cover" style={{ backgroundImage: `url(${coverUrl(it.cover)})` }}></div>
                    : <div className="cover"></div>}
                  <img className="mode" src={staticUrl(`img/mode/mode-${it.mode}.png`)} alt="" />
                  <span className={`status status-${num(it.type, 2)}`}></span>
                  <div className="meta">
                    <p className="title textfix">{it.title}</p>
                    <p className="version textfix">{versionText}</p>
                    <p className="extra textfix" title={extra}>{extra}</p>
                  </div>
                </a>
              </div>
            )
          })}
          <span className="justfix"></span>
        </div>
        <div className="g_more g_pager" style={!loading && items.length > 0 && pages > 1 ? undefined : { display: 'none' }}>
          <a href="#" className="prev" aria-label={i18nT('Previous')} onClick={(e) => { e.preventDefault(); toPage(page - 1) }}>&lt;</a>
          <span onClick={() => {
            const raw = window.prompt(i18nT('Select page'), String(page + 1))
            if (raw === null) return
            const target = parseInt(raw, 10) - 1
            if (!Number.isNaN(target)) toPage(target)
          }}>{page + 1}/{pages}</span>
          <a href="#" className="next" aria-label={i18nT('Next')} onClick={(e) => { e.preventDefault(); toPage(page + 1) }}>&gt;</a>
        </div>
        <div className="g_memo" style={{ display: !loading && items.length === 0 ? 'block' : 'none' }}>
          <span className="g_round">{i18nT('No charts found')}</span>
          {error && (
            <a href="#" className="g_btn chart_retry" onClick={(e) => { e.preventDefault(); reload() }}>
              {i18nT('Retry')}
            </a>
          )}
        </div>
      </div>
    </Shell>
  )
}
