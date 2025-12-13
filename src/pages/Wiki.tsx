import { useEffect, useMemo, useRef, useState } from 'react'
import PageLayout from '../components/PageLayout'
import { useAuthModal } from '../components/useAuthModal'
import type { Locale } from '../i18n'
import { useI18n } from '../i18n'
import { fetchWiki, fetchWikiTemplate, getSession, saveWiki, type RespWiki } from '../network/api'
import { renderWiki, type WikiTemplate } from '../utils/wiki'
import { applyTemplateHtml, renderTemplateHtml } from '../utils/wikiTemplates'
import './wiki.css'

type WikiContext = 'page' | 'song' | 'chart' | 'user'

type WikiParams = {
  pid?: number
  sid?: number
  cid?: number
  touid?: number
  key?: string
}

const localeToLang: Record<Locale, number> = {
  'en-US': 0,
  'zh-CN': 1,
  ja: 2,
}

const parseLocationParams = () => {
  const search = new URLSearchParams(window.location.search)
  const readNumber = (key: string) => {
    const value = search.get(key)
    if (value === null || value === undefined || value === '') return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const pidFromPath = window.location.pathname.match(/\/wiki\/(\d+)/)?.[1]

  return {
    params: {
      pid: pidFromPath ? Number(pidFromPath) : readNumber('pid'),
      sid: readNumber('sid'),
      cid: readNumber('cid'),
      touid: readNumber('touid'),
      key: search.get('key') ?? undefined,
    },
    lang: readNumber('lang'),
  }
}

const buildFallbackTitle = (context: WikiContext, params: WikiParams, t: ReturnType<typeof useI18n>['t']) => {
  if (params.key) return params.key
  if (context === 'chart' && params.cid) return t('wiki.title.chart', { id: params.cid })
  if (context === 'song' && params.sid) return t('wiki.title.song', { id: params.sid })
  if (context === 'user' && params.touid) return t('wiki.title.user', { id: params.touid })
  if (params.pid) return t('wiki.title.page', { id: params.pid })
  return t('wiki.title.fallback')
}

function WikiPage() {
  const { t, lang } = useI18n()
  const { params, lang: urlLang } = useMemo(() => parseLocationParams(), [])
  const [langValue, setLangValue] = useState<number>(urlLang ?? localeToLang[lang] ?? 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [wikiHtml, setWikiHtml] = useState('')
  const [baseHtml, setBaseHtml] = useState('')
  const [templates, setTemplates] = useState<WikiTemplate[]>([])
  const [title, setTitle] = useState('')
  const [locked, setLocked] = useState(false)
  const [draft, setDraft] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [pendingSave, setPendingSave] = useState(false)
  const auth = useAuthModal({
    onSuccess: () => {
      if (!pendingSave) return
      setPendingSave(false)
      handleSave()
    },
  })
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const context: WikiContext = params.cid ? 'chart' : params.sid ? 'song' : params.touid ? 'user' : 'page'
  const hasTarget = Boolean(params.key || params.pid || params.sid || params.cid || params.touid)
  const renderOptions = useMemo(
    () => ({
      hiddenLabel: t('wiki.hiddenLabel'),
      templateLabel: t('wiki.templateLabel'),
      templateLoading: t('wiki.template.loading'),
    }),
    [t],
  )

  const languageOptions = useMemo(
    () => [
      { label: t('wiki.lang.en'), value: 0 },
      { label: t('wiki.lang.zh'), value: 1 },
      { label: t('wiki.lang.ja'), value: 2 },
      { label: t('wiki.lang.ko'), value: 3 },
      { label: t('wiki.lang.tc'), value: 4 },
    ],
    [t],
  )

  useEffect(() => {
    const container = contentRef.current
    if (!container) return
    const toggles = Array.from(container.querySelectorAll('.hidden .hide-top'))
    const handlers = toggles.map((el) => {
      const handle = () => {
        el.parentElement?.classList.toggle('open')
      }
      el.addEventListener('click', handle)
      return () => el.removeEventListener('click', handle)
    })
    return () => {
      handlers.forEach((fn) => fn())
    }
  }, [wikiHtml])

  useEffect(() => {
    if (!hasTarget) {
      setError(t('wiki.error.missingId'))
      setWikiHtml('')
      setTemplates([])
      setTitle('')
      return
    }

    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const resp: RespWiki = await fetchWiki({ ...params, lang: langValue, raw: 1 })
        if (cancelled) return
        setLocked(Boolean(resp.locked))
        const fallback = buildFallbackTitle(context, params, t)
        setTitle(resp.title ?? fallback)
        if (resp.code !== 0 || !resp.wiki) {
          setError(t('wiki.error.notFound'))
          setWikiHtml('')
          setTemplates([])
          setBaseHtml('')
          setDraft('')
          return
        }
        if (resp.raw === false) {
          setBaseHtml(resp.wiki)
          setTemplates([])
          setDraft(resp.wiki)
        } else {
          const parsed = renderWiki(resp.wiki, renderOptions)
          setBaseHtml(parsed.html)
          setTemplates(parsed.templates)
          setDraft(resp.wiki)
        }
      } catch (err) {
        console.error(err)
        if (cancelled) return
        setError(t('wiki.error.load'))
        setWikiHtml('')
        setTemplates([])
        setBaseHtml('')
        setDraft('')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [context, hasTarget, langValue, params, renderOptions, t])

  const contextLabel = t(`wiki.context.${context}`)
  const templateInfo =
    templates.length > 0 ? t('wiki.templates.found', { count: templates.length }) : t('wiki.templates.none')
  const livePreview = useMemo(() => renderWiki(draft, renderOptions), [draft, renderOptions])

  const loadTemplates = async (html: string, tmplList: WikiTemplate[]) => {
    if (!tmplList.length) {
      setWikiHtml(html)
      return
    }
    setTemplateLoading(true)
    setTemplateError('')
    try {
      const blocks = await Promise.all(
        tmplList.map(async (tmpl) => {
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
      const merged = applyTemplateHtml(html, blocks)
      setWikiHtml(merged)
    } catch (err) {
      console.error(err)
      setTemplateError(t('wiki.template.error'))
      setWikiHtml(html)
    } finally {
      setTemplateLoading(false)
    }
  }

  useEffect(() => {
    if (!baseHtml) {
      setWikiHtml('')
      setTemplateLoading(false)
      setTemplateError('')
      return
    }
    if (editMode) {
      setWikiHtml(baseHtml)
      return
    }
    loadTemplates(baseHtml, templates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHtml, templates, editMode])

  const handleSave = async () => {
    if (saving) return
    const session = getSession()
    if (!session || session.uid === 1) {
      setPendingSave(true)
      auth.openAuth('signin')
      setSaveError(t('wiki.error.auth'))
      return
    }
    if (!hasTarget) {
      setSaveError(t('wiki.error.missingId'))
      return
    }
    setSaveError('')
    setSaveSuccess('')
    setPendingSave(false)
    setSaving(true)
    try {
      const resp = await saveWiki({ ...params, lang: langValue, wiki: draft })
      if (resp.code !== 0) {
        if (resp.code === -5) {
          setPendingSave(true)
          auth.openAuth('signin')
          setSaveError(t('wiki.error.auth'))
          return
        }
        setSaveError(t('wiki.error.save'))
        return
      }
      const parsed = renderWiki(draft, renderOptions)
      setBaseHtml(parsed.html)
      setTemplates(parsed.templates)
      setSaveSuccess(t('wiki.save.success'))
      setEditMode(false)
    } catch (err) {
      console.error(err)
      setSaveError(t('wiki.error.save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageLayout className="wiki-page" topbarProps={auth.topbarProps}>

      <header className="wiki-hero content-container">
        <div>
          <p className="eyebrow">{t('wiki.eyebrow')}</p>
          <h1>{title || t('wiki.title.fallback')}</h1>
          <p className="wiki-subtitle">{t('wiki.subtitle')}</p>
          <div className="wiki-meta-row">
            <span className="pill ghost">{contextLabel}</span>
            {locked && <span className="pill danger">{t('wiki.locked')}</span>}
            <span className="pill ghost">{templateInfo}</span>
            {templateLoading && <span className="pill ghost">{t('wiki.template.loading')}</span>}
          </div>
        </div>
        <div className="wiki-controls">
          <label className="wiki-lang-label">
            <span>{t('wiki.langLabel')}</span>
            <select value={langValue} onChange={(e) => setLangValue(Number(e.target.value))}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="wiki-lang-hint">{t('wiki.langHint')}</p>
          <div className="wiki-actions">
            {editMode ? (
              <>
                <button className="btn ghost small" type="button" onClick={() => setEditMode(false)} disabled={saving}>
                  {t('wiki.edit.cancel')}
                </button>
                <button className="btn primary small" type="button" onClick={handleSave} disabled={saving}>
                  {saving ? t('wiki.save.saving') : t('wiki.save')}
                </button>
              </>
            ) : (
              <button className="btn primary small" type="button" onClick={() => setEditMode(true)}>
                {t('wiki.edit')}
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="wiki-content content-container">
        {error && <div className="wiki-empty">{error}</div>}
        {loading && !error && (
          <div className="wiki-skeleton">
            <div className="wiki-skeleton-line wide" />
            <div className="wiki-skeleton-line" />
            <div className="wiki-skeleton-line" />
          </div>
        )}
        {!loading && !error && editMode && (
          <div className="wiki-editor">
            <label className="wiki-editor-label">
              {t('wiki.editing')}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('wiki.draft.placeholder')}
              />
            </label>
            <div className="wiki-editor-feedback">
              {saveError && <p className="wiki-error">{saveError}</p>}
              {saveSuccess && <p className="wiki-success">{saveSuccess}</p>}
              {locked && <p className="wiki-warning">{t('wiki.locked')}</p>}
            </div>
            <div className="wiki-editor-preview">
              <p className="wiki-preview-label">{t('wiki.preview')}</p>
              <div className="wiki-body" dangerouslySetInnerHTML={{ __html: livePreview.html }} />
            </div>
          </div>
        )}
        {!loading && !error && !editMode && (
          <>
            {templateError && <div className="wiki-error">{templateError}</div>}
            {saveError && <div className="wiki-error">{saveError}</div>}
            {saveSuccess && <div className="wiki-success">{saveSuccess}</div>}
            {wikiHtml ? (
              <div className="wiki-body" ref={contentRef} dangerouslySetInnerHTML={{ __html: wikiHtml }} />
            ) : (
              <div className="wiki-empty">{t('wiki.error.empty')}</div>
            )}
          </>
        )}
      </section>

      {auth.modal}
    </PageLayout>
  )
}

export default WikiPage
