import { useCallback, useEffect, useState } from 'react'

type LoadState<T> = {
  data: T
  loading: boolean
  error?: string
  reload: () => void
}

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
  }, [...deps, tick])

  return { data, loading, error, reload }
}
