import type { ReactElement } from 'react'

/** 加载期骨架占位。老站服务端直出不需要，SPA 异步取数时用它们保持版式。 */

/** 生成卡片骨架节点数组；JustifyRow 依赖 Children.toArray 展开，必须用数组而非 Fragment */
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

/** 卡片网格：复用 .g_map 的尺寸，放进非 JustifyRow 的原容器（如 #maps） */
export function SkeletonCards({ count = 8 }: { count?: number }) {
  return <>{skeletonCardNodes(count)}</>
}

/** 行式列表：排行榜、通知、讨论、表单等 */
export function SkeletonRows({ count = 5, label }: { count?: number; label?: string }) {
  return (
    <div className="wb-skel-rows" role="status" aria-busy="true" aria-label={label ?? 'Loading'}>
      {Array.from({ length: count }, (_, i) => (
        <div className="wb-skel wb-skel-row" key={i} aria-hidden="true"></div>
      ))}
    </div>
  )
}
