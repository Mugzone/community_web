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

export const asString = (v: unknown, fallback = ''): string => (v === undefined || v === null ? fallback : String(v))

export type AnyRec = Record<string, any>

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
