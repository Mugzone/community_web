import { useRef, useState, type KeyboardEvent } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import Error404 from '../errors/Error404'
import { showNotify, useLoad } from '../../lib/legacy'
import { execCommand, fetchCommandAccess } from '../../network/api'
import { t as i18nT } from '../../i18n'
import './Command.css'

/** 后端负码 → 提示文案；未列出的沿用老站 util.ajax 的通用失败提示。
 *  `run` 非 uid=5 时老站抛 Http404，这里是裸 404 响应（走下方 catch），
 *  因此不需要 -404 业务码映射。 */
const ERROR_MSG: Record<number, string> = {
  '-1': 'params error',
  '-2': 'params error',
  '-3': 'Permission denied',
  '-4': 'Permission denied',
  '-1000': 'Please login again',
}

/**
 * 老站两个后台页面在 v3 融合成 /emiri/command 单页：
 *   /lolicon/command   （admin/operation.html）   → is_admin && is_superuser
 *   /lolicon/judgement （admin/operation_width.html）→ is_commu(2/3/8/9)
 * 两者渲染的是同一个输入框、POST 的是同一个 /lolicon/exec。命令集在老站
 * 本就是隐藏的（页面没有任何白名单/提示），v3 同样不在前端展示任何命令名
 * 或权限档位；能执行哪些命令完全由 /api/emiria/command/exec 的
 * is_commu → -3 → -4 权限链裁决。
 *
 * 页面可见性由 GET /api/emiria/command/access 服务端裁决，该端点只返回
 * allowed 布尔值；SPA 不靠 localStorage.groups 判断（可伪造）。
 * 其余 /lolicon/* 仍是 Abandoned。
 *
 * 与老站一致：输入 (+/-)cmd:param,param，点 Send 后把命令与返回逐行 prepend
 * 到记录区；负码按 ERROR_MSG 提示。区别在于 React 自动转义文本，不会像老站
 * jQuery 的 .prepend(html) 那样把返回值当 HTML 执行。
 */
type LineKind = 'cmd' | 'res' | 'err'
type RecordLine = { id: number; text: string; kind: LineKind }

export default function Command() {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<RecordLine[]>([
    { id: 0, text: 'What do you need?', kind: 'res' },
  ])
  const seq = useRef(1)
  // 同步 in-flight 锁：React state 批处理下 busy 挡不住同一帧内的双击 / Enter+点击。
  const inFlight = useRef(false)

  // 唯一裁决来自服务端；失败/未登录一律 fallback=false → 404 页（老站 Http404）。
  // 融合后 is_admin&&is_superuser 与 is_commu 两类用户都 allowed=true，
  // 但端点不下发档位信息，前端也不需要知道，执行权限交给 exec 端点。
  const { data: allowed, loading } = useLoad<boolean>(
    async () => (await fetchCommandAccess()).data?.allowed === true,
    [],
    false,
  )

  const prepend = (items: { text: string; kind: LineKind }[]) => {
    if (items.length === 0) return
    const base = seq.current
    seq.current += items.length
    setLines((prev) => [
      ...items.map((item, i) => ({ ...item, id: base + i })),
      ...prev,
    ])
  }

  const send = async () => {
    const cmd = input.trim()
    if (!cmd || inFlight.current) return
    inFlight.current = true
    setInput('')
    setBusy(true)
    prepend([{ text: cmd, kind: 'cmd' }])
    try {
      // postForm 在响应不是 JSON 时会把原文当字符串返回，先用 unknown 收窄。
      const raw: unknown = await execCommand(cmd)
      if (typeof raw === 'string') {
        showNotify('Unexpected response', 'err')
        prepend([{ text: raw.length > 0 ? raw : 'Empty response', kind: 'err' }])
        return
      }
      const res = (raw ?? {}) as { code?: number; data?: string }
      const code = res.code ?? 0
      if (code < 0) {
        showNotify(ERROR_MSG[code] ?? 'Please try again later', 'err')
        prepend([{ text: `Error ${code}`, kind: 'err' }])
        return
      }
      // 打包版 admin/index.js 会把返回按 \n 拆成多行；空行（如 fadian 末尾）跳过。
      const rows = String(res.data ?? '').split('\n').filter((line) => line.length > 0)
      prepend(rows.map((text) => ({ text, kind: 'res' as LineKind })))
      if (rows.length === 0) prepend([{ text: 'Done', kind: 'res' }])
    } catch {
      showNotify('Please try again later', 'err')
      prepend([{ text: 'Request failed', kind: 'err' }])
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void send()
    }
  }

  // 校验期间不提前渲染 404（避免闪屏），也不渲染输入框（避免越权用户短暂看到）。
  if (loading) {
    return (
      <Shell variant="two-col" title="Operation" sidebar={<DefaultSidebar />}>
        <div className="g_title">Running</div>
        <div className="g_cont"><p>Checking permission...</p></div>
      </Shell>
    )
  }
  // 老站 raise Http404：用 404 页隐藏页面存在，而不是 403 泄露「有这个后台」。
  if (!allowed) return <Error404 />

  return (
    <Shell variant="two-col" title="Operation" page="command" sidebar={<DefaultSidebar />}>
      <div className="g_title">Running</div>
      <div className="g_cont oper">
        <h2>Operation</h2>
        <div className="editor">
          <input
            id="J_edit"
            autoComplete="off"
            type="text"
            value={input}
            placeholder="(+/-)command:param,param"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
          />
          <span className={`g_btn btn${busy ? ' busy' : ''}`} id="J_save" onClick={() => void send()}>
            {i18nT('Send')}
          </span>
        </div>
        <div id="record">
          {lines.map((line) => (
            <p className={`cmd_line ${line.kind}`} key={line.id}>{line.text}</p>
          ))}
        </div>
      </div>
    </Shell>
  )
}
