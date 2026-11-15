import { asArray, num } from './data'

export type Rec = Record<string, unknown>

export const payloadOf = (res: unknown): Rec => {
  const root = (res ?? {}) as Rec
  return (root.data ?? root) as Rec
}

export const listOf = <T,>(res: unknown, keys: string[] = ['items', 'list']): T[] => {
  const data = payloadOf(res)
  for (const key of keys) {
    const value = data[key]
    if (value !== undefined && value !== null) return asArray<T>(value)
  }
  return asArray<T>(data)
}

export const pageCountOf = (res: unknown, includeRoot = false): number => {
  const root = (res ?? {}) as Rec
  const total = payloadOf(res).total
  return includeRoot ? num(total ?? root.total, 1) : num(total, 1)
}
