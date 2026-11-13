import { useEffect, useRef, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import Error404 from '../errors/Error404'
import { showNotify, useLoad } from '../../lib/legacy'
import {
  fetchSkinHashList,
  saveSkinHash,
  type SkinHashRow,
} from '../../network/api'
import { t as i18nT } from '../../i18n'
import './SkinHash.css'

type Access = { allowed: boolean; rows: SkinHashRow[] }
const FALLBACK: Access = { allowed: false, rows: [] }

/** 编辑态：skin 用字符串保存输入中间态，提交时按 FieldReader.getInt 回落 0。 */
type EditRow = { id: number; skin: string; hash: string }

const toEditRows = (rows: SkinHashRow[]): EditRow[] =>
  rows.map((r) => ({ id: r.id, skin: String(r.skin), hash: r.hash }))

export default function SkinHash() {
  // useLoad 只负责首次裁决与初始数据；之后不再调它的 reload（fire-and-forget，
  // 无法 await），保存后的刷新走下面自己的 refreshRows。
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
  // 同步锁：React state 批处理下 busy 挡不住同一帧内的双击。
  const inFlight = useRef(false)

  // 首次加载完成时把本地编辑态初始化为服务端数据。
  useEffect(() => {
    setRows(toEditRows(data.rows))
    setSelected(-1)
  }, [data])

  const list = rows

  /** 保存/删除成功后重新拉列表；返回 false 只提示，不改 allowed（不误变 404）。 */
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
    // 老站 Add 出来的空行（id=0）删除只操作本地 DOM，不发请求。
    if (act === 'del' && row.id === 0) {
      removeLocal(selected)
      showNotify('success', 'succ')
      return
    }
    inFlight.current = true
    setBusy(true)
    try {
      // postForm 在响应不是 JSON 时会把原文当字符串返回，先用 unknown 收窄。
      const raw: unknown = await saveSkinHash({
        act,
        id: row.id,
        skin: row.skin, // 原样交给后端 Atoi，对齐老站 FieldReader.getInt
        hash: row.hash,
      })
      const res = raw as { code?: number } | null
      if (typeof raw === 'string' || (res?.code ?? 0) < 0) {
        showNotify('Please try again later', 'err')
        return
      }
      showNotify('success', 'succ')
      // 必须等列表真正回来再解锁：否则新建行（id=0）在 GET 未返回时被再次
      // Save 会重复插入；同时刷新失败只提示，不把已可见的页面变成 Error404。
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

  // 校验期间不提前渲染 404（避免闪屏），也不渲染表格（避免越权用户短暂看到）。
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
