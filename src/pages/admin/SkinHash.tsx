import { useEffect, useRef, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import Error404 from '../errors/Error404'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import {
  fetchSkinHashList,
  saveSkinHash,
  type SkinHashRow,
} from '../../network/api'
import { t as i18nT } from '../../i18n'
import './SkinHash.css'

type Access = { allowed: boolean; rows: SkinHashRow[] }
const FALLBACK: Access = { allowed: false, rows: [] }

type EditRow = { id: number; skin: string; hash: string }

const toEditRows = (rows: SkinHashRow[]): EditRow[] =>
  rows.map((r) => ({ id: r.id, skin: String(r.skin), hash: r.hash }))

export default function SkinHash() {
  const { data, loading } = useLoad<Access>(
    async () => {
      const res = await fetchSkinHashList()
      return { allowed: true, rows: Array.isArray(res?.data?.list) ? res.data!.list : [] }
    },
    [],
    FALLBACK,
  )

  const [rows, setRows] = useState<EditRow[]>([])
  const [selected, setSelected] = useState(-1)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    setRows(toEditRows(data.rows))
    setSelected(-1)
  }, [data])

  const list = rows

  const refreshRows = async (): Promise<boolean> => {
    try {
      const res = await fetchSkinHashList()
      const next = Array.isArray(res?.data?.list) ? res.data!.list : []
      setRows(toEditRows(next))
      setSelected(-1)
      return true
    } catch {
      return false
    }
  }

  const updateCell = (idx: number, patch: Partial<EditRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    if (inFlight.current) return
    const next = [...list, { id: 0, skin: '', hash: '' }]
    setRows(next)
    setSelected(next.length - 1)
  }

  const removeLocal = (idx: number) => {
    setRows(list.filter((_, i) => i !== idx))
    setSelected(-1)
  }

  const runAction = async (act: 'del' | 'save') => {
    if (inFlight.current) return
    if (selected < 0 || selected >= list.length) {
      showNotify('Select any rows', 'err')
      return
    }
    const row = list[selected]
    if (act === 'del' && row.id === 0) {
      removeLocal(selected)
      showNotify('success', 'succ')
      return
    }
    inFlight.current = true
    setBusy(true)
    try {
      const raw: unknown = await saveSkinHash({
        act,
        id: row.id,
        skin: row.skin,
        hash: row.hash,
      })
      const res = raw as { code?: number } | null
      if (typeof raw === 'string' || (res?.code ?? 0) < 0) {
        showNotify('Please try again later', 'err')
        return
      }
      showNotify('success', 'succ')
      if (!(await refreshRows())) {
        showNotify('Please try again later', 'err')
      }
    } catch {
      showNotify('Please try again later', 'err')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Shell variant="two-col" title="Skin Valid Hash" sidebar={<DefaultSidebar />}>
        <div className="g_title">Skin Valid Hash</div>
        <div className="g_cont"><p>Checking permission...</p></div>
      </Shell>
    )
  }
  if (!data.allowed) return <Error404 />

  return (
    <Shell variant="two-col" title="Skin Valid Hash" page="skinhash" sidebar={<DefaultSidebar />}>
      <div className="g_title">Skin Valid Hash</div>
      <div className="g_cont g_wiki">
        <table className="adm_table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>ID</th>
              <th style={{ width: 200 }}>Skin ID</th>
              <th style={{ width: 300 }}>Hash</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, idx) => (
              <tr
                key={`${row.id}-${idx}`}
                className={selected === idx ? 'curr' : ''}
                onClick={() => setSelected(idx)}
              >
                <td data-key="id">{row.id === 0 ? '(new)' : row.id}</td>
                <td>
                  <input
                    type="text"
                    value={row.skin}
                    aria-label={`Skin ID ${idx}`}
                    onChange={(e) => updateCell(idx, { skin: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.hash}
                    aria-label={`Hash ${idx}`}
                    onChange={(e) => updateCell(idx, { hash: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="adm_table_control">
          <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); addRow() }}>
            {i18nT('Add')}
          </a>
          <a
            href="#"
            className={`g_btn${busy ? ' busy' : ''}`}
            onClick={(e) => { e.preventDefault(); void runAction('del') }}
          >
            {i18nT('Delete')}
          </a>
          <a
            href="#"
            className={`g_btn${busy ? ' busy' : ''}`}
            onClick={(e) => { e.preventDefault(); void runAction('save') }}
          >
            {i18nT('Save')}
          </a>
        </div>
      </div>
    </Shell>
  )
}
