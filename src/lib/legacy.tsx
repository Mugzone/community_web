import { Children, Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import { SkeletonRows } from '../components/Skeleton'

/**
 * 老站大量列表用 `text-align: justify` + inline-block 卡片实现两端对齐，
 * 依赖 HTML 源码里相邻元素之间的空白文本节点（Django 模板换行天然产生）。
 * React 的 JSX / .map() 输出连续元素、不带空白，justify 会失效，卡片全部挤在左侧。
 * 此组件在每个 child 之后补一个空格文本节点，恢复老站布局；末尾的
 * `<span class="justfix" />` 也要一起放进来，最后一行才能正确换行。
 */
export function JustifyRow({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <>
      {items.map((child, i) => (
        <Fragment key={i}>{child}{' '}</Fragment>
      ))}
    </>
  )
}

/* 老站 CSS 已迁入 src/styles/legacy/，由 Shell 用声明式 <style> 渲染；
   这里不再做动态 link 注入、版本号映射或引用计数。 */

type LoadState<T> = {
  data: T
  loading: boolean
  error?: string
  reload: () => void
}

/** 统一异步加载：失败时保留兜底数据，页面结构不塌。 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[], fallback: T): LoadState<T> {
  const [data, setData] = useState<T>(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((v) => v + 1), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(undefined)
    loader()
      .then((res) => {
        if (alive) setData(res ?? fallback)
      })
      .catch((e: unknown) => {
        if (alive) {
          setData(fallback)
          setError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, reload }
}

let notifyListener: ((msg: string, type: 'succ' | 'err') => void) | undefined
let loadingListener: ((on: boolean) => void) | undefined

export const setNotifyListener = (fn: typeof notifyListener) => {
  notifyListener = fn
  return () => {
    notifyListener = undefined
  }
}
export const setGlobalLoadingListener = (fn: typeof loadingListener) => {
  loadingListener = fn
  return () => {
    loadingListener = undefined
  }
}
export const showNotify = (msg: string, type: 'succ' | 'err' = 'err') => notifyListener?.(msg, type)
export const setGlobalLoading = (on: boolean) => loadingListener?.(on)

/** 老站 .pager.g_more 结构 */
export function Pager({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  if (total <= 1) return null
  return (
    <div className="pager g_more">
      {page > 1 ? (
        <a href="#" className="g_round" onClick={(e) => { e.preventDefault(); onChange(page - 1) }}>&lt;</a>
      ) : (
        <a className="fake" href="#">&nbsp;</a>
      )}
      <span>{page}/{total}</span>
      {page < total ? (
        <a href="#" className="g_round" onClick={(e) => { e.preventDefault(); onChange(page + 1) }}>&gt;</a>
      ) : (
        <a className="fake" href="#">&nbsp;</a>
      )}
    </div>
  )
}

/** 统一加载态：用骨架行占位，不再显示裸 "Loading..." 文本（老站服务端直出无此态） */
export function LoadingBlock({ text = 'Loading...', count = 5 }: { text?: string; count?: number }) {
  return <SkeletonRows count={count} label={text} />
}

export function EmptyBlock({ text = 'No data' }: { text?: string }) {
  return <div className="empty_block">{text}</div>
}

export function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="g_rblock">
      <p className="label">{title}{extra}</p>
      {children}
    </div>
  )
}

/** 老站 util.js:152-168 formatTime：今天 H:M:S / 同年 M-D H:M / 跨年 Y-M-D H:M。
 *  入参为秒级时间戳；>= 1e12 视为毫秒级以兼容部分 v3 数据源。 */
export const formatTime = (ts?: number | string) => {
  if (ts === undefined || ts === null || ts === '') return ''
  const n = typeof ts === 'string' ? Number(ts) : ts
  if (!Number.isFinite(n)) return String(ts)
  const d = new Date(n < 1e12 ? n * 1000 : n)
  if (Number.isNaN(d.getTime())) return String(ts)
  const now = new Date()
  const pad = (v: number) => (v < 10 ? `0${v}` : String(v))
  const Y = d.getFullYear()
  const M = d.getMonth() + 1
  const D = d.getDate()
  const H = d.getHours()
  const Min = pad(d.getMinutes())
  const S = pad(d.getSeconds())
  if (Y === now.getFullYear() && d.getMonth() === now.getMonth() && D === now.getDate()) {
    return `${H}:${Min}:${S}`
  }
  if (Y === now.getFullYear()) return `${M}-${D} ${H}:${Min}`
  return `${Y}-${M}-${D} ${H}:${Min}`
}

export const num = (v: unknown, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 对齐 Django 模板的 floatformat 过滤器（老站排行榜/成绩页用它格式化 Acc. 与 BPM）。
 * - floatFormat(v, 2) 等价 `floatformat:-2`：数值为整数时直接输出（不补 .00），
 *   有小数时固定 2 位小数并保留末尾 0（34.2 → "34.20"）。
 * - floatFormat(v, 0) 等价 `floatformat:0`：四舍五入到整数。
 */
export const floatFormat = (v: unknown, digits = 2): string => {
  if (v === undefined || v === null || v === '') return ''
  const raw = String(v)
  const n = Number(v)
  if (!Number.isFinite(n)) return raw
  if (digits <= 0) return String(Math.round(n))
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(digits)
}

export const asArray = <T,>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[]
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const key of ['data', 'list', 'items', 'results']) {
      if (Array.isArray(o[key])) return o[key] as T[]
    }
  }
  return []
}
