import { useEffect, useMemo, useState } from 'react'
import AuthModal from '../components/AuthModal'
import Footer from '../components/Footer'
import Topbar from '../components/Topbar'
import { useI18n } from '../i18n'
import {
  fetchSongCharts,
  fetchSongInfo,
  fetchWiki,
  fetchWikiTemplate,
  setSession,
  type RespSongChartsItem,
  type RespSongInfo,
} from '../network/api'
import { coverUrl, modeLabel } from '../utils/formatters'
import { renderWiki, type WikiTemplate } from '../utils/wiki'
import { applyTemplateHtml, renderTemplateHtml } from '../utils/wikiTemplates'
import './home.css'
import './song.css'
import './wiki.css'

const parseSongId = () => {
  const match = window.location.pathname.match(/\/song\/(\d+)/)
  if (match?.[1]) return Number(match[1])
  const search = new URLSearchParams(window.location.search)
  const sid = search.get('sid')
  return sid ? Number(sid) : undefined
}

const formatSeconds = (value?: number) => {
  if (!value || Number.isNaN(value)) return ''
  const minutes = Math.floor(value / 60)
  const seconds = Math.max(0, value - minutes * 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function SongPage() {
  const { t } = useI18n()
  const songId = useMemo(() => parseSongId(), [])
  const [info, setInfo] = useState<RespSongInfo>()
  const [charts, setCharts] = useState<RespSongChartsItem[]>([])
  const [infoError, setInfoError] = useState('')
  const [chartsError, setChartsError] = useState('')
  const [wikiError, setWikiError] = useState('')
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [loadingCharts, setLoadingCharts] = useState(false)
  const [wikiLoading, setWikiLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [wikiHtml, setWikiHtml] = useState('')
  const [baseWiki, setBaseWiki] = useState('')
  const [wikiTemplates, setWikiTemplates] = useState<WikiTemplate[]>([])
  const [templateError, setTemplateError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [userName, setUserName] = useState<string>()

  const renderOptions = useMemo(
    () => ({
      hiddenLabel: t('wiki.hiddenLabel'),
      templateLabel: t('wiki.templateLabel'),
      templateLoading: t('wiki.template.loading'),
    }),
    [t],
  )

  useEffect(() => {
    if (!songId || Number.isNaN(songId)) {
      setInfoError(t('song.error.missingId'))
      return
    }
    let cancelled = false
    setLoadingInfo(true)
    setInfoError('')
    fetchSongInfo({ sid: songId })
      .then((resp) => {
        if (cancelled) return
        if (resp.code !== 0) {
          setInfoError(t('song.error.load'))
          return
        }
        setInfo(resp)
      })
      .catch(() => {
        if (cancelled) return
        setInfoError(t('song.error.load'))
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false)
      })

    setLoadingCharts(true)
    setChartsError('')
    fetchSongCharts({ sid: songId })
      .then((resp) => {
        if (cancelled) return
        if (resp.code !== 0 || !resp.data) {
          setChartsError(t('song.charts.loadError'))
          setCharts([])
          return
        }
        setCharts(resp.data)
      })
      .catch(() => {
        if (cancelled) return
        setChartsError(t('song.charts.loadError'))
        setCharts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingCharts(false)
      })

    setWikiLoading(true)
    setWikiError('')
    fetchWiki({ sid: songId, raw: 1 })
      .then((resp) => {
        if (cancelled) return
        if (resp.code !== 0 || !resp.wiki) {
          setWikiHtml('')
          setWikiTemplates([])
          setBaseWiki('')
          setWikiError('')
          return
        }
        if (resp.raw === false) {
          setBaseWiki(resp.wiki)
          setWikiTemplates([])
        } else {
          const parsed = renderWiki(resp.wiki, renderOptions)
          setBaseWiki(parsed.html)
          setWikiTemplates(parsed.templates)
        }
      })
      .catch(() => {
        if (cancelled) return
        setWikiError(t('song.wiki.error'))
        setBaseWiki('')
        setWikiTemplates([])
        setWikiHtml('')
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [renderOptions, songId, t])
  useEffect(() => {
    if (!baseWiki) {
      setWikiHtml('')
      setTemplateError('')
      setTemplateLoading(false)
      return
    }
    if (!wikiTemplates.length) {
      setWikiHtml(baseWiki)
      setTemplateLoading(false)
      return
    }
    let cancelled = false
    const loadTemplates = async () => {
      setTemplateLoading(true)
      setTemplateError('')
      try {
        const blocks = await Promise.all(
          wikiTemplates.map(async (tmpl) => {
            try {
              const resp = await fetchWikiTemplate({ name: tmpl.name, ...tmpl.params })
              if (resp.code !== 0) return renderTemplateHtml(t, tmpl, resp)
              return renderTemplateHtml(t, tmpl, resp)
            } catch (err) {
              console.error(err)
              return `<div class="wiki-template-placeholder wiki-template-warning">${t('wiki.template.error')}</div>`
            }
          }),
        )
        if (cancelled) return
        const merged = applyTemplateHtml(baseWiki, blocks)
        setWikiHtml(merged)
      } catch (err) {
        console.error(err)
        if (cancelled) return
        setTemplateError(t('wiki.template.error'))
        setWikiHtml(baseWiki)
      } finally {
        if (!cancelled) setTemplateLoading(false)
      }
    }
    loadTemplates()
    return () => {
      cancelled = true
    }
  }, [baseWiki, t, wikiTemplates])

  const infoLength = info?.length ? t('charts.card.length', { value: formatSeconds(info.length) }) : t('charts.card.lengthUnknown')
  const infoBpm = info?.bpm ? t('charts.card.bpm', { value: info.bpm }) : t('charts.card.bpmUnknown')

  const chartTypeLabel = (type?: number) => {
    if (type === 0) return "Alpha"
    if (type === 1) return "Beta"
    if (type === 2) return "Stable"
    return t('song.charts.type.unknown', { value: type ?? '-' })
  }

  const chartUpdatedLabel = (time?: number) => {
    if (!time) return t('charts.card.updatedUnknown')
    const date = new Date(time * 1000)
    if (Number.isNaN(date.getTime())) return t('charts.card.updatedUnknown')
    return t('charts.card.updated', { time: date.toLocaleDateString() })
  }

  return (
    <div className="page song-page">
      <Topbar
        onSignIn={() => {
          setAuthMode('signin')
          setAuthOpen(true)
        }}
        onSignUp={() => {
          setAuthMode('signup')
          setAuthOpen(true)
        }}
        onSignOut={() => {
          setSession(undefined)
          setUserName(undefined)
        }}
        userName={userName}
      />

      <header className="song-hero content-container">
        <div className="song-cover" style={{ backgroundImage: `url(${coverUrl(info?.cover)})` }} />
        <div className="song-summary">
          <p className="eyebrow">{t('song.eyebrow')}</p>
          <h1>{info?.title || t('song.placeholder.title')}</h1>
          <p className="song-artist">{info?.artist || t('song.placeholder.artist')}</p>
          {(info?.titleOrg || info?.artistOrg) && (
            <p className="song-original">
              {info?.titleOrg ?? ''} {info?.artistOrg ? `· ${info.artistOrg}` : ''}
            </p>
          )}
          <div className="song-meta-row">
            <span className="pill ghost">{infoLength}</span>
            <span className="pill ghost">{infoBpm}</span>
            {songId && !Number.isNaN(songId) && <span className="pill ghost">{t('song.meta.id', { id: songId })}</span>}
          </div>
          {loadingInfo && !info && <p className="song-loading">{t('charts.loading')}</p>}
          {infoError && <p className="song-error">{infoError}</p>}
        </div>
      </header>

      <main className="content-container">
        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t('song.charts.eyebrow')}</p>
              <h2>{t('song.charts.title')}</h2>
            </div>
          </div>
          {chartsError && <div className="song-error">{chartsError}</div>}
          {loadingCharts && !chartsError ? (
            <div className="song-chart-grid">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div className="song-chart-card skeleton" key={idx}>
                  <div className="song-chart-head" />
                  <div className="song-chart-meta" />
                </div>
              ))}
            </div>
          ) : charts.length ? (
            <div className="song-chart-grid">
              {charts.map((chart) => (
                <a className="song-chart-card" href={`/chart/${chart.cid}`} key={chart.cid}>
                  <div className="song-chart-main">
                    <p className="song-chart-title">{chart.version || t('song.charts.untitled')}</p>
                    <div className="song-chart-tags">
                      <span className="pill ghost">{modeLabel(chart.mode)}</span>
                      <span className="pill ghost">{chartTypeLabel(chart.type)}</span>
                    </div>
                  </div>
                  <div className="song-chart-meta-row">
                    <span className="song-chart-meta">
                      {chart.creator ? t('song.charts.creator', { name: chart.creator }) : t('song.charts.creatorUnknown')}
                    </span>
                    <span className="song-chart-dot">•</span>
                    <span className="song-chart-meta">{chartUpdatedLabel(chart.time)}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="song-empty">{loadingCharts ? t('charts.loading') : t('song.charts.empty')}</div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t('song.wiki.eyebrow')}</p>
              <h2>{t('song.wiki.title')}</h2>
            </div>
            {songId && (
              <a className="link" href={`/wiki/?sid=${songId}`}>
                {t('song.wiki.viewFull')}
              </a>
            )}
          </div>
          {wikiError && <div className="song-error">{wikiError}</div>}
          {(wikiLoading || templateLoading) && !wikiError && (
            <div className="song-wiki-skeleton">
              <div className="line wide" />
              <div className="line" />
              <div className="line" />
            </div>
          )}
          {!wikiLoading && !wikiError && (
            <>
              {templateError && <div className="song-error">{templateError}</div>}
              {wikiHtml ? (
                <div className="wiki-body" dangerouslySetInnerHTML={{ __html: wikiHtml }} />
              ) : (
                <div className="song-empty">{t('song.wiki.empty')}</div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer
        links={[
          { label: 'Discord', href: 'https://discord.gg/unk9hgF' },
          { label: 'Facebook', href: 'https://www.facebook.com/MalodyHome' },
          { label: 'Sina', href: 'http://weibo.com/u/5351167572' },
        ]}
        showLanguageSelector
      />

      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={({ username }) => setUserName(username)}
        />
      )}
    </div>
  )
}

export default SongPage
