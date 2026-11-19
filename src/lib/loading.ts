/**
 * 全局「发送中」浮层的状态源。
 *
 * 本站所有写请求都收敛在 network/api.ts 的 postForm()，由它在请求开始/结束时
 * 调用 beginLoading()/endLoading()。这里用计数而不是布尔：多个请求并发时只显示
 * 一层浮层，且必须等最后一个请求结束才收起。
 *
 * 与 lib/notify.ts 一样做成模块级 store + 订阅，避免把 UI 状态塞进网络层，
 * 也方便网络层在非 React 环境（工具模块、冒烟测试）里照常调用。
 */
type Listener = () => void

let activeCount = 0
const listeners = new Set<Listener>()

const emit = () => {
  listeners.forEach((listener) => listener())
}

/** 供 useSyncExternalStore 订阅；返回值是 unsubscribe，交给 React 管理生命周期。 */
export const subscribeLoading = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getLoadingCount = (): number => activeCount

/** 服务端渲染 / hydration 首帧的快照：此刻永远没有进行中的请求。 */
export const getServerLoadingCount = (): number => 0

export const beginLoading = (): void => {
  activeCount += 1
  emit()
}

export const endLoading = (): void => {
  activeCount = Math.max(0, activeCount - 1)
  emit()
}

/**
 * 包住一个异步请求。无论成功、业务错误还是网络异常，都在 finally 里收尾，
 * 避免浮层因为异常路径卡死在屏幕上。
 */
export const withGlobalLoading = async <T>(task: () => Promise<T>): Promise<T> => {
  beginLoading()
  try {
    return await task()
  } finally {
    endLoading()
  }
}
