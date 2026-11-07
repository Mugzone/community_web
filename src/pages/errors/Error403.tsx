import { Shell } from '../../components/Layout'

/**
 * 403.html（{% if reason %} 三分支）
 * reason 由调用方按老站场景传入，默认展示 403_1。
 */
export default function Error403({ reason = 0 }: { reason?: number }) {
  const text = reason === 2
    ? 'You are not the owner of the page'
    : "You don't have permission for the page, ask admin for help"

  return (
    <Shell variant="wide" css={['akari.css']}>
      <div className="g_cont2 g_rblock" style={{ padding: 10 }}>
        <p>{text}</p>
      </div>
    </Shell>
  )
}
