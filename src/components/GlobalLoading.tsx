import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import {
  getLoadingCount,
  getServerLoadingCount,
  subscribeLoading,
} from '../lib/loading'

// 很快的请求不显示浮层，避免屏幕上闪一下；一旦显示则至少停留一段时间，
// 避免「刚出现就消失」同样刺眼。真正的等待由网络层计数决定。
const SHOW_DELAY_MS = 180
const MIN_VISIBLE_MS = 320

/**
 * 全局「发送中」浮层。挂在应用根部（main.tsx），不依赖 Shell：
 * ChartTalk 等 variant="simple" 的页面同样会发 POST，但它们不渲染 #g_loading，
 * 且 data-styles 不是 main。用 portal 挂到 body 也能避开页面内的 overflow/transform。
 */
export default function GlobalLoading() {
  const count = useSyncExternalStore(
    subscribeLoading,
    getLoadingCount,
    getServerLoadingCount,
  )
  const pending = count > 0

  const [visible, setVisible] = useState(false)
  // effect 只依赖 pending，用 ref 读取当前可见性，避免把计时器逻辑搅进渲染循环。
  const visibleRef = useRef(false)
  visibleRef.current = visible
  const shownAtRef = useRef(0)

  useEffect(() => {
    if (pending) {
      if (visibleRef.current) return
      const timer = window.setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, SHOW_DELAY_MS)
      return () => window.clearTimeout(timer)
    }

    if (!visibleRef.current) return
    const elapsed = Date.now() - shownAtRef.current
    const timer = window.setTimeout(
      () => setVisible(false),
      Math.max(0, MIN_VISIBLE_MS - elapsed),
    )
    return () => window.clearTimeout(timer)
  }, [pending])

  // SSR 与首屏不渲染任何节点。
  if (!visible || typeof document === 'undefined') return null

  return createPortal(
    <div className="wb-loading-mask" role="status" aria-live="polite" aria-busy="true">
      <div className="wb-loading-box">
        <div className="wb-loading-spin" aria-hidden="true" />
        <div className="wb-loading-text">{t('Submitting...')}</div>
      </div>
    </div>,
    document.body,
  )
}
