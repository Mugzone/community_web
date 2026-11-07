import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { useLoad, asArray, showNotify, LoadingBlock, floatFormat, formatTime } from '../../lib/legacy'
import { URLS, staticUrl } from '../../lib/urls'
import { fetchSongInfo, fetchSongCharts, fetchWiki } from '../../network/api'
import { fetchSongPage, fetchWikiLang, operateWikiPage } from '../../network/legacy'
import { bindHiddenToggles } from '../../utils/wiki'
import { wikiToHtml, useWikiHtml, LangTabs, TalkWidget } from './WikiPage'
import { t as i18nT } from '../../i18n'
import { coverUrl } from '../../utils/formatters'

/* ------------------------------------------------------------------ *
 * wiki/wiki_page_song.html（base_width.html 宽版）+ module/wiki
 * ------------------------------------------------------------------ */

type ChartRow = {
  id?: number | string
  cid?: number | string
  display_version?: string
  version?: string
  level?: number | string
  length?: number | string
  mode?: number
  playcount?: number | string
  hot?: number | string
  author_id?: number | string
  uid?: number | string
  author?: { username?: string }
  creator?: string
  lastedit_str?: string
  time?: number | string
  type?: number
}
type TagRow = { id?: number | string; name?: string }
type SongState = {
  song: Record<string, any>
  songEx: { title: string; artist: string; hasOrg: boolean }
  charts: ChartRow[]
  tags: TagRow[]
  wikiRaw: string
  canCover: boolean
  canDel: boolean
  canMerge: boolean
  canEdit: boolean
}
const EMPTY_SONG: SongState = {
  song: {},
  songEx: { title: '', artist: '', hasOrg: false },
  charts: [],
  tags: [],
  wikiRaw: '',
  canCover: true,
  canDel: true,
  canMerge: true,
  canEdit: true,
}

const TYPE_LABELS = ['Alpha', 'Beta', 'Stable']

/**
 * 老站 wikipage/models.py:404 TempDataChart.display_version：
 * level=0 原样返回；否则去掉 version 里已有的 LV.<n>，再统一拼 " Lv.<level>"。
 * 后端 /community/song/page 的 chartlist 已带 display_version，这里只用于
 * /community/song/charts 兜底数据（该接口只有 version + level）。
 */
const displayVersion = (c: ChartRow): string => {
  if (c.display_version) return String(c.display_version)
  const raw = String(c.version ?? '')
  const lv = Number(c.level ?? 0)
  if (!Number.isFinite(lv) || lv <= 0) return raw
  return `${raw.replace(/LV\.\d+/gi, '')} Lv.${lv}`
}

/** wiki/display_chart_list.html —— 谱面列表 */
function ChartList({ charts, songId }: { charts: ChartRow[]; songId: number | string }) {
  return (
    <div className="g_block chartlist">
      <div className="tip">{i18nT('Search')}<span>s{songId}</span>from client to download</div>
      <div className="bg">
        <h2>
          <i className="col1">{i18nT('Version')}</i>
          <i className="col2">{i18nT('Length')}</i>
          <i className="col3">{i18nT('Status')}</i>
          <i className="col4">{i18nT('Hot')}</i>
          <i className="col5">{i18nT('Creator')}</i>
          <i className="col6">{i18nT('Updated')}</i>
        </h2>
        {charts.map((c, i) => (
          <h2 className="item" key={`${c.id ?? 'c'}-${i}`}>
            <i className="col1 textfix">
              <img src={staticUrl(`img/mode/mode-${c.mode ?? 0}.png`)} alt="" />
              <a href={URLS.chartPage(c.id ?? c.cid ?? 0)}>{displayVersion(c)}</a>
            </i>
            <i className="col2">{c.length ?? ''}</i>
            <i className="col3">{c.type !== undefined ? (TYPE_LABELS[c.type] ?? c.type) : ''}</i>
            <i className="col4">{c.playcount ?? c.hot ?? 0}</i>
            <i className="col5 textfix"><a href={URLS.user(c.author_id ?? c.uid ?? 0)}>{c.author?.username ?? c.creator ?? ''}</a></i>
            <i className="col6">{c.lastedit_str ?? (c.time !== undefined ? formatTime(c.time) : '')}</i>
          </h2>
        ))}
      </div>
    </div>
  )
}

export default function SongPage() {
  const params = useParams<{ id?: string }>()
  const id = params.id
    ?? new URLSearchParams(window.location.search).get('id')
    ?? window.location.pathname.match(/\/(\d+)\/?$/)?.[1]
    ?? ''
  const keyFromQuery = new URLSearchParams(window.location.search).get('key')
  const key = keyFromQuery || `song_${id}`

  const { data, loading } = useLoad<SongState>(
    async () => {
      const sid = Number(id) || 0
      const [pageR, infoR, chartsR, wikiR] = await Promise.all([
        fetchSongPage(String(id)).catch(() => ({})),
        fetchSongInfo({ sid }).catch(() => ({})),
        fetchSongCharts({ sid }).catch(() => ({})),
        fetchWiki({ sid, lang: 0, raw: 1 }).catch(() => ({})),
      ])
      const p: any = (pageR as any)?.data ?? pageR ?? {}
      const info: any = infoR ?? {}
      const song: Record<string, any> = { ...info, ...(p.song ?? {}) }
      const songExRaw: any = p.song_ex ?? {}
      const title = String(songExRaw.title ?? info.title ?? song.title ?? '')
      const artist = String(songExRaw.artist ?? info.artist ?? song.artist ?? '')
      const hasOrg = Boolean(songExRaw.hasOrg) || (Boolean(song.titleOrg) && song.titleOrg !== song.title)
      // 老站 display_chart_list.html 用后端算好的 display_version；
      // /community/song/charts 只给 version+level（连 id 都没有），仅作兜底。
      const charts: ChartRow[] = asArray<ChartRow>(p.chartlist ?? (chartsR as any)?.data ?? chartsR)
      const tags: TagRow[] = asArray<any>(p.taglist ?? info.tagOptions ?? []).map((t: any) => {
        const inner = t?.tag ?? t
        return { id: inner?.id ?? t?.id, name: inner?.name ?? t?.name }
      })
      return {
        song,
        songEx: { title, artist, hasOrg },
        charts,
        tags,
        wikiRaw: String((wikiR as any)?.wiki ?? p.content ?? ''),
        canCover: p.canCover !== false,
        canDel: p.canDel !== false,
        canMerge: p.canMerge !== false,
        canEdit: p.canEdit !== false,
      }
    },
    [id],
    EMPTY_SONG,
  )

  const wikiHtml = useWikiHtml(data.wikiRaw)
  const [lang, setLang] = useState<string>('en')
  const [langHtml, setLangHtml] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => bindHiddenToggles(bodyRef.current), [wikiHtml, langHtml])

  const onChangeLang = async (code: string, label: string): Promise<void> => {
    setLang(code)
    try {
      const resp: any = await fetchWikiLang(key, code)
      const raw = String(resp?.data ?? resp ?? '')
      setLangHtml(raw ? wikiToHtml(raw).html : '')
    } catch {
      setLangHtml(null)
      showNotify('Server error', 'err')
    }
  }

  const onEdit = (): void => {
    window.location.href = `/wiki/edit?key=${encodeURIComponent(key)}&lang=${lang}`
  }

  const onTool = async (type: string): Promise<void> => {
    if (type === 'edit') { onEdit(); return }
    if (type === 'edit_meta') {
      window.location.href = `/wiki/meta?key=${encodeURIComponent(key)}`
      return
    }
    if (type === 'del') {
      if (!window.confirm('Are you sure to delete the page?')) return
      try { await operateWikiPage('del', { key }) }
      catch { showNotify('Delete failed', 'err') }
      return
    }
    if (type === 'merge') {
      const v = window.prompt('enter new song id', '')
      if (v) {
        try { await operateWikiPage('merge', { key, new_song: Number(v) }); showNotify('Success', 'succ') }
        catch { showNotify('Transfer failed', 'err') }
      }
      return
    }
  }

  const song = data.song
  const rawCover = String(song.cover_url ?? song.cover ?? '')
  const cover = rawCover ? coverUrl(rawCover) : staticUrl('img/cover.png')
  const songId = song.id ?? id
  const title = String(song.title ?? '')
  const artist = String(song.artist ?? '')
  const finalHtml = langHtml !== null ? langHtml : wikiHtml
  const gWikiInner = finalHtml || '<div class="g_wiki_new btn" data-type="edit">Add description to the song</div>'

  return (
    <Shell
      variant="wide"
      title={title}
      css={['wiki.css', 'tmpl.css']}
      chead={song.cover ? <div className="cover" style={{ backgroundImage: `url(${cover})` }}></div> : undefined}
    >
      <div className="song_title g_rblock">
        <div className="coverb">
          <div className="cover" style={{ backgroundImage: `url(${cover})` }}></div>
          {data.canCover && (
            <a href={`/upload/cover?sid=${songId}`} className="g_toolbtn e" title="Edit meta"><i></i></a>
          )}
        </div>

        <div className="right">
          {data.songEx.hasOrg && (
            <h3 className="textfix"><span className="textfix artist">{artist}</span> - {title}</h3>
          )}
          <h2 className="textfix title"><span className="textfix artist">{data.songEx.artist}</span> - {data.songEx.title}</h2>
          <h2 className="sub">
            <label>ID</label>:s<span>{songId}</span>&nbsp;&nbsp;
            <label>{i18nT('Length')}</label>:<span>{song.length ?? ''}s</span>&nbsp;&nbsp;
            <label>{i18nT('BPM')}</label>:<span>{floatFormat(song.bpm)}</span>
            <label>{i18nT('Last updated')}</label>:<span className="textfix">{song.lastedit_str ?? ''}</span>
          </h2>
          <h2 className="tags">
            {data.tags.length > 0 && (
              <>
                <span>Tags:</span>
                {data.tags.map((t, i) => (
                  <a key={`${t.id ?? 't'}-${i}`} href={`${URLS.chart}?tag=${t.id ?? 0}`}>{t.name ?? ''}</a>
                ))}
              </>
            )}
          </h2>
        </div>

        <div className="tool">
          <a href="#" className="btn g_toolbtn e" data-type="edit_meta" title="Edit meta" onClick={(e) => { e.preventDefault(); void onTool('edit_meta') }}><i></i></a>
          <a href={`${URLS.change}?key=${key}`} className="g_toolbtn log" title="Change History"><i></i></a>
          {data.canDel && <a href="#" className="btn g_toolbtn d" data-type="del" title={i18nT('Delete')} onClick={(e) => { e.preventDefault(); void onTool('del') }}><i></i></a>}
          {data.canMerge && <a href="#" className="btn g_toolbtn m" data-type="merge" title="Merge to another song" onClick={(e) => { e.preventDefault(); void onTool('merge') }}><i></i></a>}
        </div>
      </div>

      {data.charts.length > 0 ? (
        <div className="g_cont2 g_rblock">
          <ChartList charts={data.charts} songId={songId} />
        </div>
      ) : (
        <div className="g_cont2 g_rblock nochart">
          <span>{i18nT('You can add new charts to the song')}</span>
          <a href={`${URLS.create}?type=3&parent=${songId}`} className="g_btn">{i18nT('Add')}</a>
        </div>
      )}

      <div className="g_cont2 g_rblock">
        <div className="tool">
          <LangTabs value={lang} onChange={(c, l) => { void onChangeLang(c, l) }} />
          {data.canEdit && <a href="#" className="btn g_toolbtn e" data-type="edit" title={i18nT('Edit')} onClick={(e) => { e.preventDefault(); onEdit() }}><i></i></a>}
        </div>
        <div
          className="g_wiki"
          ref={bodyRef}
          onClick={(e) => { if ((e.target as HTMLElement).closest('.g_wiki_new')) onEdit() }}
        >
          <div dangerouslySetInnerHTML={{ __html: gWikiInner }} />
          <span className="clear"></span>
        </div>
        {loading && <LoadingBlock />}
      </div>

      <TalkWidget talkKey={key} hasOwner={false} />
    </Shell>
  )
}
