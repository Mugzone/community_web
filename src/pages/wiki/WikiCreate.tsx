import { useState, type ReactNode } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, showNotify, LoadingBlock } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { createWikiPage, fetchSongInfo, getSession } from '../../network/api'

/* ------------------------------------------------------------------ *
 * wiki_create/wiki_create.html / wiki_create_song.html /
 * wiki_create_chart.html（base.html 两栏, akari.css）+ module/wikiCreate
 * 按 type=1/2/3 切换表单
 * ------------------------------------------------------------------ */

const query = (k: string): string => new URLSearchParams(window.location.search).get(k) ?? ''

const CREATE_01 = 'The songs in Malody have respective introduction pages which are wiki-based, where could be edited by all users. The title and artist name (romanized) of that relevant song is required when creating the page. Plus, more updating is available to enrich the content after creating page. Please be aware that duplicate pages may be merged or removed by administrators without further notification.'
const CREATE_02 = 'The charts in Malody have respective introduction pages which are wiki-based, where could be edited by all users. The version name of that relevant chart is required when creating the page. Plus, more updating is available to enrich the content after creating page. Please be aware that blank pages may be merged or removed by administrators without further notification.'
const CREATE_03 = 'You can upload your chart and create chart page with Malody editor (NoteArt) automatically'

/** GLOBAL_PAGE：intro3=3 / intro2=3 / lang=5 / editor=1368 —— 保持老站 /wiki/<id> URL */
const HELP_LINKS = (
  <>
    <a href={URLS.wiki(3)}>How to create a new article</a>,{' '}
    <a href={URLS.wiki(3)}>How to create a new song/chart</a>,{' '}
    <a href={URLS.wiki(5)}>About Multi-language</a>
  </>
)

export default function WikiCreate() {
  const initialType = Number(query('type') || '1')
  const parent = query('parent')
  const [type, setType] = useState<number>(initialType)
  const [title, setTitle] = useState<string>(query('title'))
  const [artist, setArtist] = useState<string>('')
  const [version, setVersion] = useState<string>('')
  const [eventName, setEventName] = useState<string>(query('title'))
  const [templateName, setTemplateName] = useState<string>(query('title'))
  const [submitting, setSubmitting] = useState(false)

  const { data: parentSong, loading } = useLoad<Record<string, any>>(
    async () => {
      if (!parent) return {} as Record<string, any>
      const resp = await fetchSongInfo({ sid: Number(parent) || 0 }).catch(() => ({}))
      return (resp ?? {}) as Record<string, any>
    },
    [parent, type],
    {} as Record<string, any>,
  )

  const switchType = (t: number): void => {
    setType(t)
    window.history.replaceState(null, '', `${URLS.create}?type=${t}`)
  }

  const onSubmit = async (): Promise<void> => {
    if (submitting) return
    let submitTitle = title
    if (type === 5) submitTitle = eventName
    if (type === 6) submitTitle = templateName
    if (!submitTitle.trim() || (type === 2 && !artist.trim()) || (type === 3 && !version.trim())) {
      return
    }
    const uid = getSession()?.uid ?? 1
    setSubmitting(true)
    try {
      const resp = await createWikiPage({ uid, title: submitTitle.trim(), type })
      if (resp.exist) {
        showNotify('The page is already exist.', 'err')
        return
      }
      if (resp.id) {
        const dest = type === 2
          ? URLS.song(resp.id)
          : type === 3
            ? URLS.chartPage(resp.id)
            : type === 6
              ? `/page/tmpl/edit?tid=${resp.id}`
              : URLS.wiki(resp.id)
        window.location.href = dest
        return
      }
      showNotify('Failed to craete, please try again later.', 'err')
    } catch {
      showNotify('Failed to craete, please try again later.', 'err')
    } finally {
      setSubmitting(false)
    }
  }

  const typeSwitcher = (
    <div className="g_select create_types" style={{ marginBottom: 12 }}>
      <span className={type === 1 ? 'curr' : ''} onClick={() => switchType(1)}>Article</span>
      <span className={type === 2 ? 'curr' : ''} onClick={() => switchType(2)}>Song</span>
      <span className={type === 3 ? 'curr' : ''} onClick={() => switchType(3)}>Chart</span>
    </div>
  )

  const footerTip = (blank: string): ReactNode => (
    <div className="g_tip">
      <span className="err">Failed to craete, please try again later.</span>
      <span>{blank}</span>
      <span className="err">The page is already exist.<em></em></span>
    </div>
  )

  /* wiki_create.html —— type=1（含 5/6 分支） */
  const articleForm = (
    <>
      <h1 className="help">Help: {HELP_LINKS}</h1>
      {type === 5 ? (
        <h1><label htmlFor="title">Event name</label><input type="text" id="title" value={eventName} onChange={(e) => setEventName(e.target.value)} /></h1>
      ) : type === 6 ? (
        <h1><label htmlFor="title">Template</label><input type="text" id="title" value={templateName} onChange={(e) => setTemplateName(e.target.value)} /></h1>
      ) : (
        <h1><label htmlFor="title">Title</label><input type="text" placeholder="Article title, song name or chart name" id="title" value={title} onChange={(e) => setTitle(e.target.value)} /></h1>
      )}
      <div className="button">
        <div className="g_btn btn" id="J_submit" onClick={() => { void onSubmit() }}>Submit</div>
        <a href="#" onClick={(e) => { e.preventDefault(); window.history.back() }}>Cancel</a>
      </div>
      {footerTip('Please fill in title and select language.')}
    </>
  )

  /* wiki_create_song.html —— type=2 */
  const songForm = (
    <>
      <h1 className="help">{CREATE_01}</h1>
      <h1 className="help">Document: {HELP_LINKS}</h1>
      <h1><label htmlFor="title">Title</label><input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} /></h1>
      <h1><label htmlFor="artist">Artist</label><input type="text" id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} /></h1>
      <div className="button">
        <div className="g_btn btn" id="J_submit" onClick={() => { void onSubmit() }}>Submit</div>
      </div>
      {footerTip('Please fill in blanks')}
    </>
  )

  /* wiki_create_chart.html —— type=3 */
  const songLabel = String(parentSong.title ?? query('title'))
  const chartForm = (
    <>
      <h1 className="help">{CREATE_02}</h1>
      <div className="block">
        <div className="sec">Create from editor</div>
        <h1 className="help">{CREATE_03}</h1>
        <h1 className="help">Document: <a href={URLS.wiki(1368)}>Introduce to editor</a></h1>
      </div>
      <div className="block">
        <div className="sec">Create manually</div>
        <h1 className="help">Document: {HELP_LINKS}</h1>
        <h1><label>Song</label><span>{songLabel}</span></h1>
        <h1><label htmlFor="version">Version</label><input style={{ backgroundColor: 'white' }} type="text" id="version" placeholder="Example: 4K HD, 7K Lv.10" value={version} onChange={(e) => setVersion(e.target.value)} /></h1>
        <div className="button">
          <div className="g_btn btn" id="J_submit" onClick={() => { void onSubmit() }}>Submit</div>
        </div>
        {footerTip('Please fill in blanks')}
      </div>
    </>
  )

  let form: ReactNode
  if (type === 2) form = songForm
  else if (type === 3) form = chartForm
  else form = articleForm

  return (
    <Shell
      variant="two-col"
      title={type === 2 || type === 3 ? 'Create song' : 'Create pages'}
      css={['akari.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>Others</h4>
          <a href={`${URLS.create}`} onClick={(e) => { e.preventDefault(); switchType(1) }}>New Article</a>
          <a href={`${URLS.create}?type=2`} onClick={(e) => { e.preventDefault(); switchType(2) }}>New Song</a>
          <a href={`${URLS.create}?type=3&parent=${parent}`} onClick={(e) => { e.preventDefault(); switchType(3) }}>New Chart</a>
          <a href={`${URLS.create}?type=6`} onClick={(e) => { e.preventDefault(); switchType(6) }}>Create template</a>
        </>
      }
    >
      <div className="g_title">Create new page</div>
      <div className="g_cont wiki_create">
        {typeSwitcher}
        {form}
        {loading && <LoadingBlock />}
      </div>
    </Shell>
  )
}
