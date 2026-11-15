import { useEffect, useState, type ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useSession } from '../../components/SessionProvider'
import { LoadingBlock } from '../../components/fragments'
import { num } from '../../utils/data'
import { useLoad } from '../../lib/useLoad'
import { showNotify } from '../../lib/notify'
import { URLS } from '../../lib/urls'
import {
  createEvent,
  fetchEventCharts,
  fetchStoreEvents,
  fetchWikiTemplate,
  type RespEventChartItem,
  type RespStoreEventItem,
} from '../../network/api'
import { isOrgMember } from '../../utils/auth'
import { coverUrl, modeLabel } from '../../utils/formatters'
import { t as i18nT } from '../../i18n'
import { uploadEventCover } from './uploadEventCover'
import './Event.css'

type EventForm = {
  name: string
  type: string
  start: string
  end: string
  cover: string
  wiki: string
}

type ChartPreview = {
  id: number
  title?: string
  artist?: string
  version?: string
  cover?: string
  mode?: number
  level?: number
  type?: number
}

type ChartPreviewState = { status: 'loading' | 'ready' | 'error'; data?: ChartPreview }

type InitialData = {
  info?: RespStoreEventItem
  charts: RespEventChartItem[]
  error: string
}

const EMPTY_INITIAL: InitialData = { charts: [], error: '' }
const EMPTY_FORM: EventForm = { name: '', type: '0', start: '', end: '', cover: '', wiki: '' }

const normalizeDateInput = (value: string) => value.replace(/\./g, '-')

const toPreview = (chart: RespEventChartItem): ChartPreview => ({
  id: chart.cid,
  title: chart.title,
  artist: chart.artist,
  version: chart.version,
  cover: chart.cover,
  mode: chart.mode,
  level: chart.level,
  type: chart.type,
})

export default function EventEdit() {
  const { search } = useLocation()
  const { session, isLogin } = useSession()
  const canManage = isOrgMember(session?.groups ?? [])
  const params = new URLSearchParams(search)
  const eventId = num(params.get('eid') ?? params.get('id'), 0)

  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [chartIds, setChartIds] = useState<number[]>([])
  const [chartInput, setChartInput] = useState('')
  const [chartInputError, setChartInputError] = useState('')
  const [chartPreviews, setChartPreviews] = useState<Record<number, ChartPreviewState>>({})
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdId, setCreatedId] = useState(0)
  const [coverFile, setCoverFile] = useState<File | undefined>()
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverMsg, setCoverMsg] = useState('')
  const [coverError, setCoverError] = useState('')

  const { data: initial, loading: loadingInfo, error: initialError } = useLoad<InitialData>(
    async () => {
      if (!eventId) return { charts: [], error: '' }
      let from = 0
      let found: RespStoreEventItem | undefined
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const resp = await fetchStoreEvents({ active: 0, from })
        if (resp.code !== 0 || !resp.data) return { charts: [], error: i18nT('Failed to load events') }
        found = resp.data.find((item) => item.eid === eventId)
        if (found) break
        if (!resp.hasMore || resp.next === undefined) break
        from = resp.next
      }
      if (!found) return { charts: [], error: i18nT('Event not found') }
      const chartResp = await fetchEventCharts({ eid: eventId })
      const charts = chartResp.code === 0 && chartResp.data ? chartResp.data : []
      return { info: found, charts, error: '' }
    },
    [eventId],
    EMPTY_INITIAL,
  )

  useEffect(() => {
    if (!initial.info) return
    const info = initial.info
    setForm({
      name: info.name ?? '',
      type: info.type !== undefined ? String(info.type) : '0',
      start: typeof info.start === 'string' ? normalizeDateInput(info.start) : '',
      end: typeof info.end === 'string' ? normalizeDateInput(info.end) : '',
      cover: info.cover ?? '',
      wiki: info.wiki ? String(info.wiki) : '',
    })
    setChartIds(initial.charts.map((chart) => chart.cid))
    const previews: Record<number, ChartPreviewState> = {}
    initial.charts.forEach((chart) => { previews[chart.cid] = { status: 'ready', data: toPreview(chart) } })
    setChartPreviews(previews)
  }, [initial])

  const effectiveEventId = eventId || createdId
  const loadError = initial.error || (initialError ? i18nT('Failed to load events') : '')

  const updateField = (key: keyof EventForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaveError('')
    setSaveMsg('')
  }

  const loadChartPreview = async (id: number) => {
    setChartPreviews((prev) => ({ ...prev, [id]: { status: 'loading' } }))
    try {
      const resp = await fetchWikiTemplate({ name: '_chart', id })
      const data = resp.data as Partial<ChartPreview> | undefined
      if (resp.code !== 0 || !data?.id) {
        setChartPreviews((prev) => ({ ...prev, [id]: { status: 'error' } }))
        return
      }
      setChartPreviews((prev) => ({ ...prev, [id]: { status: 'ready', data: data as ChartPreview } }))
    } catch {
      setChartPreviews((prev) => ({ ...prev, [id]: { status: 'error' } }))
    }
  }

  const addChartId = () => {
    if (!canManage) return
    const raw = chartInput.trim()
    const id = Number(raw)
    if (!raw || !Number.isFinite(id) || id <= 0) {
      setChartInputError(i18nT('Invalid chart ID'))
      return
    }
    if (chartIds.includes(id)) {
      setChartInputError(i18nT('Duplicate chart'))
      return
    }
    setChartIds((prev) => [...prev, id])
    setChartInput('')
    setChartInputError('')
    setSaveError('')
    setSaveMsg('')
    void loadChartPreview(id)
  }

  const removeChartId = (id: number) => {
    if (!canManage) return
    setChartIds((prev) => prev.filter((item) => item !== id))
    setChartPreviews((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setSaveError('')
    setSaveMsg('')
  }

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCoverFile(event.target.files?.[0])
    setCoverError('')
    setCoverMsg('')
  }

  const handleCoverUpload = async () => {
    if (!canManage) {
      setCoverError(i18nT('No permission to manage events'))
      return
    }
    if (!effectiveEventId) {
      setCoverError(i18nT('Save the event before uploading a cover'))
      return
    }
    if (!coverFile) {
      setCoverError(i18nT('Select a cover image first'))
      return
    }
    setCoverUploading(true)
    setCoverError('')
    setCoverMsg('')
    try {
      const result = await uploadEventCover(effectiveEventId, coverFile)
      if (result.code !== 0) {
        const message = Math.abs(result.code) % 1000 === 3 ? i18nT('No permission to manage events') : i18nT('Upload failed')
        setCoverError(message)
        showNotify(message, 'err')
        return
      }
      updateField('cover', result.cover ?? '')
      setCoverFile(undefined)
      setCoverMsg(i18nT('Cover uploaded'))
      showNotify(i18nT('Cover uploaded'), 'succ')
    } catch {
      setCoverError(i18nT('Upload failed'))
    } finally {
      setCoverUploading(false)
    }
  }

  const errorFromCode = (code: number): string => {
    if (code === -3) return i18nT('No permission to manage events')
    if (code === -4) return i18nT('Event limit reached')
    if (code === -1) return i18nT('Missing required fields')
    return i18nT('Operation failed')
  }

  const handleSave = async () => {
    if (!canManage) {
      const message = i18nT(isLogin ? 'No permission to manage events' : 'Editing is available for active account')
      setSaveError(message)
      showNotify(message, 'err')
      return
    }
    if (loadError) {
      setSaveError(loadError)
      return
    }
    const name = form.name.trim()
    const start = normalizeDateInput(form.start.trim())
    const end = normalizeDateInput(form.end.trim())
    const type = Number(form.type)
    const wiki = form.wiki.trim() === '' ? 0 : Number(form.wiki.trim())
    if (!name || !start || !end || !chartIds.length) {
      setSaveError(i18nT('Missing required fields'))
      return
    }
    if (!Number.isFinite(type) || type < 0 || type > 4) {
      setSaveError(i18nT('Invalid event type'))
      return
    }
    if (!Number.isFinite(wiki)) {
      setSaveError(i18nT('Invalid wiki page'))
      return
    }
    setSaving(true)
    setSaveError('')
    setSaveMsg('')
    try {
      const resp = await createEvent({
        eid: effectiveEventId,
        name,
        type,
        start,
        end,
        cids: JSON.stringify(chartIds),
        cover: form.cover.trim() || undefined,
        wiki,
      })
      if (resp.code <= 0) {
        const message = errorFromCode(resp.code)
        setSaveError(message)
        showNotify(message, 'err')
        return
      }
      if (!eventId) setCreatedId(resp.code)
      const message = eventId ? i18nT('Event saved') : i18nT('Event created')
      setSaveMsg(message)
      showNotify(message, 'succ')
    } catch {
      const message = i18nT('Operation failed')
      setSaveError(message)
      showNotify(message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const typeOptions = ['Default', 'Section', 'New default', 'New section', 'Combo']

  return (
    <Shell variant="wide" title={eventId ? i18nT('Edit event') : i18nT('Create event')} page="event" css={['wiki_edit.css', 'tmpl.css']}>
      <div className="g_cont2 g_rblock" data-type="event">
        {loadingInfo && <LoadingBlock />}
        {loadError && <p className="event_msg">{loadError}</p>}
        {!canManage && (
          <p className="event_hint">{i18nT(isLogin ? 'No permission to manage events' : 'Editing is available for active account')}</p>
        )}
        {eventId > 0 && <p className="event_hint"><a href={URLS.eventDetail(eventId)}>{i18nT('View event')}</a></p>}

        <div className="temp" data-type="event" data-id={eventId}>
          <h2>
            <label htmlFor="event_name">{i18nT('Name')}</label>
            <input id="event_name" disabled={!canManage} value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={i18nT('Name')} />
          </h2>
          <h2>
            <label htmlFor="event_type">{i18nT('Type')}</label>
            <select id="event_type" disabled={!canManage} value={form.type} onChange={(e) => updateField('type', e.target.value)}>
              {typeOptions.map((label, index) => <option value={index} key={label}>{i18nT(label)}</option>)}
            </select>
          </h2>
          <h2>
            <label htmlFor="event_start">{i18nT('Start')}</label>
            <input id="event_start" disabled={!canManage} value={form.start} onChange={(e) => updateField('start', e.target.value)} placeholder="YYYY-MM-DD" />
          </h2>
          <h2>
            <label htmlFor="event_end">{i18nT('End')}</label>
            <input id="event_end" disabled={!canManage} value={form.end} onChange={(e) => updateField('end', e.target.value)} placeholder="YYYY-MM-DD" />
          </h2>
          <h2>
            <label htmlFor="event_cover">{i18nT('Cover')}</label>
            <input id="event_cover" disabled={!canManage} value={form.cover} onChange={(e) => updateField('cover', e.target.value)} placeholder="cover/123!small" />
          </h2>
          <h2>
            <label htmlFor="event_wiki">{i18nT('Wiki page')}</label>
            <input id="event_wiki" disabled={!canManage} value={form.wiki} onChange={(e) => updateField('wiki', e.target.value)} placeholder="0" />
          </h2>
          <h2 className="tagh2">
            <label htmlFor="event_cid">{i18nT('Chart IDs')}</label>
            <span className="event_cid_input">
              <input
                id="event_cid"
                disabled={!canManage}
                value={chartInput}
                onChange={(e) => { setChartInput(e.target.value); setChartInputError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChartId() } }}
                placeholder="123"
              />
              {canManage && <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); addChartId() }}>{i18nT('Add chart')}</a>}
            </span>
          </h2>
        </div>
        {chartInputError && <p className="event_msg">{chartInputError}</p>}

        <div className="event_extra">
          <div className="event_cover_row">
            <div className="event_cover_preview" style={{ backgroundImage: `url(${coverUrl(form.cover)})` }}></div>
            <div className="event_cover_controls">
              <div className="event_cover_actions">
                <label className="event_file_label">
                  {coverFile ? coverFile.name : i18nT('Change cover')}
                  <input type="file" disabled={!canManage} accept="image/png,image/jpeg" onChange={handleCoverFileChange} />
                </label>
                {canManage && (
                  <a href="#" className="g_btn" onClick={(e) => { e.preventDefault(); void handleCoverUpload() }}>
                    {coverUploading ? i18nT('Loading') : i18nT('Upload image')}
                  </a>
                )}
              </div>
              <p className="event_hint">{i18nT('Event cover')}</p>
              {coverError && <p className="event_msg">{coverError}</p>}
              {coverMsg && <p className="event_msg ok">{coverMsg}</p>}
            </div>
          </div>

          <div className="event_section">
            <p className="label">{i18nT('Charts preview')}</p>
            {loadingInfo && <LoadingBlock />}
            {!loadingInfo && !loadError && chartIds.length === 0 && <div className="g_memo"><span className="g_round">{i18nT('No charts')}</span></div>}
            <div className="event_chart_grid">
              {chartIds.map((id) => {
                const state = chartPreviews[id]
                if (!state || state.status === 'loading') {
                  return (
                    <div className="event_chart_card" key={id}>
                      <div className="event_chart_cover"></div>
                      <div className="event_chart_body"><div className="event_chart_title">{i18nT('Loading')}</div></div>
                      {canManage && <button type="button" className="event_remove" onClick={() => removeChartId(id)}>{i18nT('Remove')}</button>}
                    </div>
                  )
                }
                if (state.status === 'error') {
                  return (
                    <div className="event_chart_card" key={id}>
                      <div className="event_chart_cover"></div>
                      <div className="event_chart_body">
                        <div className="event_chart_title">{i18nT('Chart not found')}</div>
                        <div className="event_chart_artist">#{id}</div>
                      </div>
                      {canManage && <button type="button" className="event_remove" onClick={() => removeChartId(id)}>{i18nT('Remove')}</button>}
                    </div>
                  )
                }
                const chart = state.data
                return (
                  <div className="event_chart_card" key={id}>
                    <div className="event_chart_cover" style={{ backgroundImage: `url(${coverUrl(chart?.cover)})` }}></div>
                    <div className="event_chart_body">
                      <div className="event_chart_title textfix">{chart?.title ?? i18nT('Unknown')}</div>
                      <div className="event_chart_artist textfix">{chart?.artist ?? i18nT('Unknown')}</div>
                      <div className="event_chart_tags">
                        {chart?.mode !== undefined && <span className="event_tag">{modeLabel(chart.mode)}</span>}
                        {chart?.version && <span className="event_tag">{chart.version}</span>}
                      </div>
                    </div>
                    {canManage && <button type="button" className="event_remove" onClick={() => removeChartId(id)}>{i18nT('Remove')}</button>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="button">
          {canManage && (
            <div className="g_btn btn" data-type="save" onClick={() => { void handleSave() }}>
              {saving ? i18nT('Loading') : i18nT('Save')}
            </div>
          )}
          <a href={URLS.event} className="btn" data-type="cancel">{i18nT('Cancel')}</a>
        </div>
        <div className="g_tip">
          {saveError && <span className="event_msg curr">{saveError}</span>}
          {saveMsg && <span className="event_msg ok curr">{saveMsg}</span>}
          {createdId > 0 && <span className="curr"><a href={URLS.eventDetail(createdId)}>#{createdId}</a></span>}
        </div>
      </div>
    </Shell>
  )
}
