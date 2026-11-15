type NotifyType = 'succ' | 'err'

let notifyListener: ((msg: string, type: NotifyType) => void) | undefined

export const setNotifyListener = (fn: typeof notifyListener) => {
  notifyListener = fn
  return () => {
    if (notifyListener === fn) notifyListener = undefined
  }
}

export const showNotify = (msg: string, type: NotifyType = 'err') => notifyListener?.(msg, type)
