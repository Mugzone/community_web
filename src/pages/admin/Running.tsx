import { useEffect, useRef, useState } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import Error404 from '../errors/Error404'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import {
  fetchRunningList,
  saveRunningConfig,
  saveRunningNews,
  type RunningConfigGroup,
} from '../../network/api'
import { t as i18nT } from '../../i18n'
import './Running.css'

// 老站 /lolicon/running（admin/running.html）的等价页面。
// 5 张动态配置表（admin_config type=0..4）+ 1 张新闻表；
// Add 只在前端本地插空行，Delete / Save 才发请求（与老站一致）。
//
// 老站表格末尾的 “Running data”（CGI 调用计数）不迁：那些计数只由
// 已下线的 Django clientcgi 写入，Go 侧没有等价实现，迁过来永远是空表。
//
// 页面刻意没有侧栏入口，与 /emiri/command、/emiri/skinhash 一致，
// 避免把后台地址暴露出去；非 admin+superuser 访问会拿到裸 404 → Error404。

type CfgRow = { id: number; key: string; val: string }
type CfgGroup = { type: number; name: string; rows: CfgRow[] }
type NewsRow = { id: number; title: string; desc: string; link: string }

// 新闻表与配置表共用一套选中态，用配置里不存在的 type 作为它的 key。
const NEWS_KEY = -1

type Access = { allowed: boolean; groups: CfgGroup[]; news: NewsRow[] }
const FALLBACK: Access = { allowed: false, groups: [], news: [] }

const toGroups = (groups: RunningConfigGroup[]): CfgGroup[] =>
  groups.map((g) => ({
    type: g.type,
    name: g.name,
    rows: (g.rows ?? []).map((r) => ({ id: r.id, key: r.key, val: r.val })),
  }))

// 各组 str_val 的既有格式（见 Go 侧 webpage.Home / legacy.LegacyUpdate 的解析），
// 运营商改值时最容易破坏的就是这个分隔符，故直接标在表头旁。
const GROUP_HINTS: Record<string, string> = {
  client: 'Pushed to clients as custom config, key → value',
  banner: 'Home banner: img|link',
  update: 'Client update package: hash|file',
  home: 'Home keywords: title|link',
}

const fetchAll = async (): Promise<Access> => {
  const res = await fetchRunningList()
  const config = Array.isArray(res?.data?.config) ? res.data!.config : []
  const news = Array.isArray(res?.data?.news) ? res.data!.news : []
  return {
    allowed: true,
    groups: toGroups(config),
    news: news.map((n) => ({ id: n.id, title: n.title, desc: n.desc, link: n.link })),
  }
}

export default function Running() {
  const { data, loading } = useLoad<Access>(fetchAll, [], FALLBACK)

  const [groups, setGroups] = useState<CfgGroup[]>([])
  const [news, setNews] = useState<NewsRow[]>([])
  const [sel, setSel] = useState<Record<number, number>>({})
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    setGroups(data.groups)
    setNews(data.news)
    setSel({})
  }, [data])

  const pick = (key: number) => sel[key] ?? -1
  const select = (key: number, idx: number) => setSel((prev) => ({ ...prev, [key]: idx }))

  // 写完必须等列表刷新完再解锁：新建行要拿回真实 id，被移组的行也要归位。
  const refresh = async (): Promise<boolean> => {
    try {
      const next = await fetchAll()
      setGroups(next.groups)
      setNews(next.news)
      setSel({})
      return true
    } catch {
      return false
    }
  }

  const send = async (fn: () => Promise<unknown>) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      const raw: unknown = await fn()
      const res = raw as { code?: number } | null
      if (typeof raw === 'string' || (res?.code ?? 0) < 0) {
        // 服务端只有 -1：必填项为空、超长、记录不存在。
        showNotify('Check the fields and try again', 'err')
        return
      }
      showNotify('success', 'succ')
      if (!(await refresh())) showNotify('Please try again later', 'err')
    } catch {
      showNotify('Please try again later', 'err')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const editRow = (group: number, idx: number, patch: Partial<CfgRow>) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.type === group
          ? { ...g, rows: g.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }
          : g,
      ),
    )

  const addConfigRow = (group: number) => {
    if (inFlight.current) return
    const rows = groups.find((g) => g.type === group)?.rows ?? []
    setGroups((prev) =>
      prev.map((g) =>
        g.type === group ? { ...g, rows: [...g.rows, { id: 0, key: '', val: '' }] } : g,
      ),
    )
    select(group, rows.length)
  }

  const runConfig = (group: number, act: 'del' | 'save') => {
    const rows = groups.find((g) => g.type === group)?.rows ?? []
    const idx = pick(group)
    if (idx < 0 || idx >= rows.length) {
      showNotify('Select any rows', 'err')
      return
    }
    const row = rows[idx]
    if (act === 'del' && row.id === 0) {
      // 本地新增还没落库的行，直接删掉，不必打扰服务端。
      setGroups((prev) =>
        prev.map((g) =>
          g.type === group ? { ...g, rows: g.rows.filter((_, i) => i !== idx) } : g,
        ),
      )
      select(group, -1)
      showNotify('success', 'succ')
      return
    }
    void send(() =>
      act === 'del'
        ? saveRunningConfig({ act, target: group, id: row.id })
        : saveRunningConfig({ act, target: group, id: row.id, key: row.key, val: row.val }),
    )
  }

  const editNews = (idx: number, patch: Partial<NewsRow>) =>
    setNews((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const addNews = () => {
    if (inFlight.current) return
    setNews((prev) => [...prev, { id: 0, title: '', desc: '', link: '' }])
    select(NEWS_KEY, news.length)
  }

  const runNews = (act: 'del' | 'save') => {
    const idx = pick(NEWS_KEY)
    if (idx < 0 || idx >= news.length) {
      showNotify('Select any rows', 'err')
      return
    }
    const row = news[idx]
    if (act === 'del' && row.id === 0) {
      setNews((prev) => prev.filter((_, i) => i !== idx))
      select(NEWS_KEY, -1)
      showNotify('success', 'succ')
      return
    }
    void send(() =>
      act === 'del'
        ? saveRunningNews({ act, id: row.id })
        : saveRunningNews({
            act,
            id: row.id,
            title: row.title,
            desc: row.desc,
            link: row.link,
          }),
    )
  }

  if (loading) {
    return (
      <Shell variant="two-col" title="Running" sidebar={<DefaultSidebar />}>
        <div className="g_title">Running</div>
        <div className="g_cont"><p>Checking permission...</p></div>
      </Shell>
    )
  }
  if (!data.allowed) return <Error404 />

  return (
    <Shell variant="two-col" title="Running" page="running" sidebar={<DefaultSidebar />}>
      <div className="g_title">Running</div>
      <div className="g_cont g_wiki">
        {groups.map((g) => (
          <section key={g.type} className="running_block">
            <h2>
              {g.name}
              <span className="running_type">type={g.type}</span>
            </h2>
            {GROUP_HINTS[g.name] ? <p className="running_hint">{GROUP_HINTS[g.name]}</p> : null}
            <table className="adm_table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>ID</th>
                  <th style={{ width: 260 }}>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row, idx) => (
                  <tr
                    key={`${g.type}-${row.id}-${idx}`}
                    className={pick(g.type) === idx ? 'curr' : ''}
                    onClick={() => select(g.type, idx)}
                  >
                    <td data-key="id">{row.id === 0 ? '(new)' : row.id}</td>
                    <td>
                      <input
                        type="text"
                        value={row.key}
                        aria-label={`${g.name} key ${idx}`}
                        onChange={(e) => editRow(g.type, idx, { key: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.val}
                        aria-label={`${g.name} value ${idx}`}
                        onChange={(e) => editRow(g.type, idx, { val: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="adm_table_control">
              <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); addConfigRow(g.type) }}>
                {i18nT('Add')}
              </a>
              <a
                href="#"
                className={`g_btn${busy ? ' busy' : ''}`}
                onClick={(e) => { e.preventDefault(); runConfig(g.type, 'del') }}
              >
                {i18nT('Delete')}
              </a>
              <a
                href="#"
                className={`g_btn${busy ? ' busy' : ''}`}
                onClick={(e) => { e.preventDefault(); runConfig(g.type, 'save') }}
              >
                {i18nT('Save')}
              </a>
            </div>
          </section>
        ))}

        <section className="running_block">
          <h2>news</h2>
          <p className="running_hint">Pushed to clients and the home page; title and link are required</p>
          <table className="adm_table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>ID</th>
                <th style={{ width: 220 }}>Title</th>
                <th style={{ width: 260 }}>Desc</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {news.map((row, idx) => (
                <tr
                  key={`news-${row.id}-${idx}`}
                  className={pick(NEWS_KEY) === idx ? 'curr' : ''}
                  onClick={() => select(NEWS_KEY, idx)}
                >
                  <td data-key="id">{row.id === 0 ? '(new)' : row.id}</td>
                  <td>
                    <input
                      type="text"
                      value={row.title}
                      aria-label={`news title ${idx}`}
                      onChange={(e) => editNews(idx, { title: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.desc}
                      aria-label={`news desc ${idx}`}
                      onChange={(e) => editNews(idx, { desc: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.link}
                      aria-label={`news link ${idx}`}
                      onChange={(e) => editNews(idx, { link: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="adm_table_control">
            <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); addNews() }}>
              {i18nT('Add')}
            </a>
            <a
              href="#"
              className={`g_btn${busy ? ' busy' : ''}`}
              onClick={(e) => { e.preventDefault(); runNews('del') }}
            >
              {i18nT('Delete')}
            </a>
            <a
              href="#"
              className={`g_btn${busy ? ' busy' : ''}`}
              onClick={(e) => { e.preventDefault(); runNews('save') }}
            >
              {i18nT('Save')}
            </a>
          </div>
        </section>
      </div>
    </Shell>
  )
}
