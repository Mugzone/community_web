import type { ReactElement } from 'react'


export function skeletonCardNodes(count = 8): ReactElement[] {
  return Array.from({ length: count }, (_, i) => (
    <div className="g_map wb-skel-card" key={`skel-card-${i}`} aria-hidden="true">
      <div className="cover wb-skel"></div>
      <div className="meta">
        <div className="wb-skel wb-skel-line"></div>
        <div className="wb-skel wb-skel-line is-short"></div>
      </div>
    </div>
  ))
}

export function SkeletonCards({ count = 8 }: { count?: number }) {
  return <>{skeletonCardNodes(count)}</>
}

export function SkeletonHead({ lines = 3 }: { lines?: number }) {
  return (
    <div className="right" role="status" aria-busy="true" aria-label="Loading">
      <div className="wb-skel wb-skel-text is-title" aria-hidden="true"></div>
      {Array.from({ length: lines }, (_, i) => (
        <div className="wb-skel wb-skel-text" key={i} aria-hidden="true"></div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 5, label }: { count?: number; label?: string }) {
  return (
    <div className="wb-skel-rows" role="status" aria-busy="true" aria-label={label ?? 'Loading'}>
      {Array.from({ length: count }, (_, i) => (
        <div className="wb-skel wb-skel-row" key={i} aria-hidden="true"></div>
      ))}
    </div>
  )
}
