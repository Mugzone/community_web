import { useRef, useState, type KeyboardEvent } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import Error404 from '../errors/Error404'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { execCommand, fetchCommandAccess } from '../../network/api'
import { t as i18nT } from '../../i18n'
import './Command.css'

const ERROR_MSG: Record<number, string> = {
  '-1': 'params error',
  '-2': 'params error',
  '-3': 'Permission denied',
  '-4': 'Permission denied',
  '-1000': 'Please login again',
}

type LineKind = 'cmd' | 'res' | 'err'
type RecordLine = { id: number; text: string; kind: LineKind }

export default function Command() {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<RecordLine[]>([
    { id: 0, text: 'What do you need?', kind: 'res' },
  ])
  const seq = useRef(1)
  const inFlight = useRef(false)

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

  if (loading) {
    return (
      <Shell variant="two-col" title="Operation" sidebar={<DefaultSidebar />}>
        <div className="g_title">Running</div>
        <div className="g_cont"><p>Checking permission...</p></div>
      </Shell>
    )
  }
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
