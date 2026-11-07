import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, asArray, showNotify, LoadingBlock, EmptyBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchWikiChange, fetchWikiBackup, saveWikiBackup } from '../../network/legacy'
import { t as i18nT } from '../../i18n'

type ChangeItem = {
  user_id?: number | string
  user?: { id?: number | string; username?: string }
  username?: string
  msg?: string
  create_time_str?: string
}
type Tab = 'changes' | 'backup'
const FALLBACK: ChangeItem[] = []

const uidOf = (it: ChangeItem): number | string => it.user_id ?? it.user?.id ?? 0
const nameOf = (it: ChangeItem): string => it.user?.username ?? it.username ?? ''

/** /page/change —— 老站 wiki_change.html + module/wikiChange（tab + 存档读档） */
export default function WikiChange() {
  const [sp, setSp] = useSearchParams()
  const pid = sp.get('pid') ?? '0'
  const [tab, setTab] = useState<Tab>('changes')
  const [backupContent, setBackupContent] = useState('')

  const { data, loading } = useLoad<ChangeItem[]>(
    async () => {
      const resp: any = await fetchWikiChange(pid)
      const p: any = resp?.data ?? resp
      return asArray<ChangeItem>(p?.content ?? p?.items ?? p?.list ?? p)
    },
    [pid],
    FALLBACK,
  )

  const items = data ?? []

  const readBackup = async () => {
    try {
      const resp: any = await fetchWikiBackup(pid)
      setBackupContent(String(resp?.data?.content ?? resp?.content ?? resp?.data ?? ''))
    } catch { /* ignore */ }
  }

  const writeBackup = async () => {
    if (!window.confirm('Sure to recover from old version?')) return
    try {
      await saveWikiBackup(pid, backupContent)
      showNotify('Recover successful!')
    } catch {
      showNotify('Recover failed', 'err')
    }
  }

  return (
    <Shell variant="two-col" css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">Changes</div>
      <div className="g_cont wiki_change">
        <div className="g_actbar">
          <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); window.history.back() }}>{i18nT('Back')}</a>
          <a href="#" className={`g_btn${tab === 'changes' ? ' curr' : ''}`} onClick={(e) => { e.preventDefault(); setTab('changes') }}>Changes</a>
          <a href="#" className={`g_btn${tab === 'backup' ? ' curr' : ''}`} onClick={(e) => { e.preventDefault(); setTab('backup') }}>{i18nT('Backup')}</a>
          <input className="g_round" value={pid} placeholder="pid" onChange={(e) => setSp({ pid: e.target.value })} />
          {tab === 'backup' && (
            <>
              <a href="#" className="g_btn btn" data-type="read" onClick={(e) => { e.preventDefault(); void readBackup() }}>Read</a>
              <a href="#" className="g_btn btn" data-type="recover" onClick={(e) => { e.preventDefault(); void writeBackup() }}>Recover</a>
            </>
          )}
        </div>
        {tab === 'changes' ? (
          <>
            {items.map((it, i) => (
              <h1 key={i}>
                <a className="red" href={URLS.user(uidOf(it))}>{nameOf(it)}</a>
                <span>{it.msg}</span>
                <span className="textfix gray">-- {it.create_time_str}</span>
              </h1>
            ))}
            {loading && <LoadingBlock />}
            {!loading && items.length === 0 && <EmptyBlock />}
          </>
        ) : (
          <div className="g_wiki">
            <h1 className="msg">{i18nT('Backup')}</h1>
            <textarea value={backupContent} onChange={(e) => setBackupContent(e.target.value)} cols={80} rows={12} dir="ltr" />
            <p>Use Read to load a backup, Recover to restore from it.</p>
          </div>
        )}
      </div>
    </Shell>
  )
}
