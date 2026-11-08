import { Fragment, useEffect, useState } from 'react'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, num, showNotify, LoadingBlock } from '../../lib/legacy'
import { fetchSongInfo, fetchChartInfo, saveSongInfo, saveChartInfo, promoteChart } from '../../network/api'
import { t as i18nT } from '../../i18n'

/* ------------------------------------------------------------------ *
 * wiki/wiki_edit_meta.html（wide, wiki_edit.css）+ module/wikiEdit
 * 动态 include：wiki/song.html / wiki/chart.html
 * ------------------------------------------------------------------ */

const query = (k: string): string => new URLSearchParams(window.location.search).get(k) ?? ''

type TagOption = { id?: number | string; name?: string; type?: number }
type MetaState = {
  info: Record<string, any>
  tags: TagOption[]
  selected: (number | string)[]
  pm: number
}
const EMPTY_META: MetaState = { info: {}, tags: [], selected: [], pm: 12000 }

const MODE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Key' }, { value: 3, label: 'Catch' }, { value: 4, label: 'Pad' },
  { value: 5, label: 'Taiko' }, { value: 6, label: 'Ring' }, { value: 7, label: 'Slide' },
  { value: 8, label: 'Live' }, { value: 9, label: 'Cube' },
]

export default function WikiMeta() {
  const key = query('key')
  const metaType = key.startsWith('chart') ? 'chart' : 'song'
  const idMatch = key.match(/(\d+)/)
  const id = idMatch ? Number(idMatch[1]) : 0

  const { data, loading } = useLoad<MetaState>(
    async () => {
      const resp: any = metaType === 'song'
        ? await fetchSongInfo({ sid: id }).catch(() => ({}))
        : await fetchChartInfo({ cid: id }).catch(() => ({}))
      const info: Record<string, any> = (resp ?? {}) as Record<string, any>
      const tags: TagOption[] = asArray<TagOption>(info.tagOptions ?? resp?.tagOptions)
      const selected: (number | string)[] = asArray<any>(info.tags ?? []).map((t: any) => (
        typeof t === 'object' && t !== null ? (t.id ?? t) : t
      ))
      return { info, tags, selected, pm: num(resp?.pm, 12000) }
    },
    [key, metaType],
    EMPTY_META,
  )

  const [form, setForm] = useState<Record<string, string>>({})
  const [currTags, setCurrTags] = useState<(number | string)[]>([])

  /* 老站 wiki/chart.html 由 general_meta 注入四个权限标志：
       isAss   = 非作者 && is_assistent  → 整个 Status 下拉
       isPub   = is_pub                  → Status 里的 "Stable - Done" 选项
       isSelf  = 作者本人                → Promotion 按钮
       canHide = is_commu               → Hide 下拉（后端改 author 也是这个权限）
     标志由后端 GET /community/chart/info 下发，缺省一律视为无权限（fail-closed），
     并且最终写入仍由 SaveChartInfo 逐字段二次校验。 */
  const isAss = Boolean(data.info.isAss)
  const isPub = Boolean(data.info.isPub)
  const isSelf = Boolean(data.info.isSelf)
  const canHide = Boolean(data.info.canHide)
  const chartType = num(form.type, 0)

  useEffect(() => {
    const f: Record<string, string> = {}
    Object.entries(data.info).forEach(([k, v]) => { f[k] = v === undefined || v === null ? '' : String(v) })
    setForm(f)
  }, [data.info])
  useEffect(() => setCurrTags(data.selected), [data.selected])

  const setField = (k: string, v: string): void => setForm((prev) => ({ ...prev, [k]: v }))
  const toggleTag = (tid: number | string): void => {
    setCurrTags((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]))
  }

  const onSave = async (): Promise<void> => {
    const must: string[] = metaType === 'song'
      ? ['title', 'artist', 'length', 'bpm']
      : ['version']
    for (const m of must) {
      if (!form[m] || !form[m].trim()) {
        showNotify(`${m} is empty`, 'err')
        return
      }
    }
    try {
      if (metaType === 'song') {
        await saveSongInfo({
          sid: id,
          title: form.title ?? '',
          artist: form.artist ?? '',
          length: num(form.length, 0),
          bpm: num(form.bpm, 0),
          titleOrg: form.titleOrg,
          artistOrg: form.artistOrg,
          tags: currTags.map((t) => Number(t)).filter((n) => Number.isFinite(n)),
        })
      } else {
        // 与老站一致：模板里被权限隐藏的控件根本不会出现在表单里，
        // 后端 reader.getInt("type", -1) 等拿到缺省值后保持原值。
        // 前端同样只在有权限时提交这些字段，避免把当前值误写回去。
        const payload: Parameters<typeof saveChartInfo>[0] = {
          cid: id,
          version: form.version,
          length: num(form.length, 0),
          level: num(form.level, 0),
          mode: num(form.mode, 0),
          free: num(form.free, 0),
          offset: num(form.offset, 0),
          tags: currTags.map((t) => Number(t)).filter((n) => Number.isFinite(n)),
        }
        if (canHide) {
          payload.creator = num(form.uid, 0)
          payload.hide = form.hide === 'True'
        }
        if (isAss) payload.type = num(form.type, 0)
        await saveChartInfo(payload)
      }
      window.history.back()
    } catch {
      showNotify(i18nT('Failed to save, please try again later.'), 'err')
    }
  }

  const onCancel = (): void => {
    window.history.back()
  }

  const onPromote = async (): Promise<void> => {
    // 老站 general_meta: pm = 12000，mode != 0 时减半（PromoteChart 同样口径）
    const price = num(form.mode, 0) === 0 ? 12000 : 6000
    if (!window.confirm(`Pay ${price} gold for the promotion?`)) return
    try {
      await promoteChart({ cid: id })
      showNotify('Success', 'succ')
    } catch {
      showNotify('System error', 'err')
    }
  }

  const tagArea = (
    <h2 className="tagh2">
      <label>Tags</label>
      <div className="tag_area g_select">
        {data.tags.map((t, i) => {
          const prevType = i > 0 ? data.tags[i - 1].type : undefined
          const sep = t.type !== undefined && prevType !== undefined && t.type !== prevType
          return (
            <Fragment key={i}>
              {sep && <em></em>}
              <span
                data-id={t.id ?? 0}
                className={currTags.includes(t.id ?? 0) ? 'curr' : ''}
                onClick={() => toggleTag(t.id ?? 0)}
              >{t.name ?? ''}</span>
            </Fragment>
          )
        })}
      </div>
    </h2>
  )

  const songTemp = (
    <div className="temp" data-type="song" data-id={id}>
      <h2><label>{i18nT('Title')}</label><input type="text" className="must" name="title" data-limit={255} placeholder="romanized title" style={{ width: 400 }} value={form.title ?? ''} onChange={(e) => setField('title', e.target.value)} /></h2>
      <h2><label>{i18nT('Original Title')}</label><input type="text" name="titleOrg" data-limit={255} placeholder="title in original language" style={{ width: 400 }} value={form.titleOrg ?? ''} onChange={(e) => setField('titleOrg', e.target.value)} /></h2>
      <h2><label>{i18nT('Artist')}</label><input type="text" className="must" name="artist" data-limit={255} placeholder="romanized artist name" style={{ width: 400 }} value={form.artist ?? ''} onChange={(e) => setField('artist', e.target.value)} /></h2>
      <h2><label>{i18nT('Original Artist')}</label><input type="text" name="artistOrg" data-limit={255} placeholder="artist name in original language" style={{ width: 400 }} value={form.artistOrg ?? ''} onChange={(e) => setField('artistOrg', e.target.value)} /></h2>
      <h2><label>{i18nT('Length')}</label><input type="text" className="number must" name="length" placeholder="in second" value={form.length ?? ''} onChange={(e) => setField('length', e.target.value)} /></h2>
      <h2><label>{i18nT('BPM')}</label><input type="text" className="number must" name="bpm" value={form.bpm ?? ''} onChange={(e) => setField('bpm', e.target.value)} /></h2>
      {tagArea}
    </div>
  )

  const chartTemp = (
    <div className="temp" data-type="chart" data-id={id}>
      <h2><label>{i18nT('Version')}</label><input type="text" name="version" value={form.version ?? ''} onChange={(e) => setField('version', e.target.value)} /></h2>
      {/* 老站这里填的是 t.author.id（数字）。后端 RespChartInfo.creator 是用户名字符串、
          uid 才是作者 ID；旧实现 num(form.creator, 0) 恒为 0，导致作者永远改不了。
          后端 update_chart_owner 要求 is_commu，故无权限时只读，避免误导。 */}
      <h2><label>{i18nT('Creator')}</label><input type="text" name="creator" value={form.uid ?? ''} disabled={!canHide} onChange={(e) => setField('uid', e.target.value)} /></h2>
      <h2><label>{i18nT('Chart Length')}</label><input type="text" name="length" title="in second" value={form.length ?? ''} onChange={(e) => setField('length', e.target.value)} /></h2>
      <h2><label>{i18nT('Level')}</label><input type="text" name="level" title="1-30" value={form.level ?? ''} onChange={(e) => setField('level', e.target.value)} /></h2>
      <h2><label>{i18nT('Mode')}</label>
        <select name="mode" value={form.mode ?? '0'} onChange={(e) => setField('mode', e.target.value)}>
          {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </h2>
      <h2><label>Free Style</label>
        <select name="free" value={form.free ?? '0'} onChange={(e) => setField('free', e.target.value)}>
          <option value="0">None</option>
          <option value="1">RM Style</option>
        </select>
      </h2>
      {/* 老站 {% if isAss %} 才渲染整个 Status 下拉，{% if isPub %} 才追加 Stable 选项 */}
      {isAss && (
        <h2><label>{i18nT('Status')}</label>
          <select name="type" value={form.type ?? '0'} onChange={(e) => setField('type', e.target.value)}>
            <option value="0">Alpha - Work in progress</option>
            <option value="1">Beta - Ready for test</option>
            {/* 当前已是 Stable 但不是 publisher 时，保留只读的当前值以免 select 失去选中项 */}
            {(isPub || chartType === 2) && <option value="2" disabled={!isPub}>Stable - Done</option>}
          </select>
        </h2>
      )}
      {/* 老站 {% if canHide %}（is_commu）才渲染 Hide */}
      {canHide && (
        <h2><label>Hide</label>
          <select name="hide" value={form.hide ?? 'False'} onChange={(e) => setField('hide', e.target.value)}>
            <option value="False">No</option>
            <option value="True">Yes</option>
          </select>
        </h2>
      )}
      <h2><label>Offset</label><input type="text" name="offset" title="audio offset" value={form.offset ?? ''} onChange={(e) => setField('offset', e.target.value)} /></h2>
      <h2><label>{i18nT('Checksum')}</label><input type="text" className="disable" style={{ width: 400 }} name="checksum" disabled value={form.checksum ?? ''} /></h2>
      {/* 老站 {% if isSelf and t.type != 2 %} 才渲染推广按钮；且 Chart Promotion 功能已下线 */}
      {isSelf && chartType !== 2 && (
        <h2><label>{i18nT('Promotion')}</label><div className="g_btn btn" data-type="pm" onClick={() => { void onPromote() }}>{i18nT('Promote now')}</div></h2>
      )}
      {tagArea}
    </div>
  )

  return (
    <Shell variant="wide" title="Edit meta" css={['wiki_edit.css', 'tmpl.css']}>
      <div className="g_cont2 g_rblock" data-type={metaType} data-id={id}>
        {metaType === 'song' ? songTemp : chartTemp}

        <div className="button">
          <div className="g_btn btn" data-type="save" onClick={() => { void onSave() }}>{i18nT('Save')}</div>
          <a href="#" className="btn" data-type="cancel" onClick={(e) => { e.preventDefault(); onCancel() }}>{i18nT('Cancel')}</a>
        </div>
        <div className="g_tip">
          <span>{i18nT('Saving...')}</span>
          <span className="err">{i18nT('Failed to save, please try again later.')}</span>
          <span className="err">{i18nT('Please check the information field.')}<em></em></span>
          <span className="err">{i18nT('Please check the category, read category guide if need help.')}</span>
          <span className="err">{i18nT('You are not permitted to edit this page.')}</span>
        </div>
        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
