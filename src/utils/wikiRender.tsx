import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchWikiTemplate, type RespWikiTemplate } from '../network/api'
import { fetchWikiLang } from '../network/pageWeb'
import { showNotify } from '../lib/notify'
import { t as i18nT } from '../i18n'
import {
  renderWiki, renderChat, wikiRenderOptions, escapeHtml, sanitizeUrl, sanitizeRenderedHtml,
  looksLikeLegacyHtml, sanitizeLegacyHtml,
  type WikiTemplate, type WikiRenderOptions,
} from './wiki'
import { renderTemplateHtml, applyTemplateHtml } from './wikiTemplates'


const FEISHU_PREFIX = '<p>https://cbo17ty22x.feishu.cn/wiki/'

export const RENDER_OPTIONS: WikiRenderOptions = {
  hiddenLabel: i18nT('Click to display'),
  templateLabel: i18nT('Template'),
  templateLoading: i18nT('Loading template...'),
}

const TMPL_TEXT: Record<string, string> = {
  'wiki.template.login': 'Please sign in to view this block.',
  'wiki.template.finish': 'Finished',
  'wiki.template.empty': 'No entries yet.',
  'wiki.template.group': 'Group {{id}}',
  'wiki.template.eventsum': 'Event summary',
  'wiki.template.table.rank': '#',
  'wiki.template.table.player': i18nT('Player'),
  'wiki.template.table.value': 'Total',
  'wiki.template.unsupported': 'Template coming soon.',
  'wiki.template.unknown': 'Unknown template.',
}
export const tr = (key: string, vars?: Record<string, string | number>): string => {
  let s = i18nT(TMPL_TEXT[key] ?? key)
  if (vars) Object.keys(vars).forEach((k) => { s = s.replace(`{{${k}}}`, String(vars[k])) })
  return s
}

const TEMPLATE_PARAM_ALIAS: Record<string, string> = { uid: 'touid', key: 'tmplKey' }
const templateQuery = (params: Record<string, string>): Record<string, string> => {
  const q: Record<string, string> = {}
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'name') return
    q[TEMPLATE_PARAM_ALIAS[k] ?? k] = v
  })
  return q
}

export function wikiToHtml(
  raw: string,
  options: Partial<WikiRenderOptions> = {},
): { html: string; templates: WikiTemplate[] } {
  const text = String(raw ?? '')
  const r = renderWiki(text, wikiRenderOptions({ ...RENDER_OPTIONS, ...options }))
  const html = sanitizeRenderedHtml(r.html)
  if (html.startsWith(FEISHU_PREFIX)) {
    const url = sanitizeUrl(html.replace(/<\/?p>/g, '').trim())
    if (!/^https:\/\/cbo17ty22x\.feishu\.cn\/wiki\/[A-Za-z0-9_?=&%#./-]*$/.test(url)) {
      return { html, templates: [] }
    }
    return {
      html: `<iframe width="100%" height="1145px" frameborder="0" seamless src="${url}"></iframe>`,
      templates: [],
    }
  }
  return { html, templates: r.templates }
}

export function useWikiHtml(raw: string, options: Partial<WikiRenderOptions> = {}): string {
  const { hiddenLabel, templateLabel, templateLoading, ignoreTemplates, literalTemplates } = options
  const result = useMemo(
    () => wikiToHtml(raw, {
      ...RENDER_OPTIONS,
      ...(hiddenLabel !== undefined ? { hiddenLabel } : {}),
      ...(templateLabel !== undefined ? { templateLabel } : {}),
      ...(templateLoading !== undefined ? { templateLoading } : {}),
      ...(ignoreTemplates !== undefined ? { ignoreTemplates } : {}),
      ...(literalTemplates !== undefined ? { literalTemplates } : {}),
    }),
    [raw, hiddenLabel, templateLabel, templateLoading, ignoreTemplates, literalTemplates],
  )
  const [filled, setFilled] = useState<{ src: typeof result; html: string } | null>(null)
  useEffect(() => {
    let alive = true
    if (!result.templates.length) return
    void (async () => {
      const emptyResp: RespWikiTemplate = { code: 0, data: {} }
      const blocks = await Promise.all(result.templates.map(async (tmpl) => {
        const n = tmpl.name.replace(/^_/, '')
        if (n === 'action') return renderTemplateHtml(tr, tmpl, emptyResp)
        try {
          const resp = await fetchWikiTemplate({ name: n, ...templateQuery(tmpl.params) })
          return renderTemplateHtml(tr, tmpl, resp)
        } catch {
          return renderTemplateHtml(tr, tmpl, emptyResp)
        }
      }))
      if (alive) setFilled({ src: result, html: sanitizeRenderedHtml(applyTemplateHtml(result.html, blocks)) })
    })()
    return () => { alive = false }
  }, [result])
  return filled?.src === result ? filled.html : result.html
}

type LangSelection = { key: string; lang: string; raw: string | null }

export function useWikiLang(key: string): {
  lang: string
  langHtml: string | null
  changeLang: (code: string) => Promise<void>
} {
  const [selection, setSelection] = useState<LangSelection>({ key, lang: 'en', raw: null })
  const current: LangSelection = selection.key === key ? selection : { key, lang: 'en', raw: null }
  const reqRef = useRef(0)
  const rendered = useWikiHtml(current.raw ?? '')

  const changeLang = useCallback(async (code: string): Promise<void> => {
    const req = ++reqRef.current
    setSelection((prev) => ({ key, lang: code, raw: prev.key === key ? prev.raw : null }))
    try {
      const resp = await fetchWikiLang(key, code)
      if (req !== reqRef.current) return
      setSelection({ key, lang: code, raw: String(resp?.data ?? resp ?? '') })
    } catch {
      if (req !== reqRef.current) return
      setSelection({ key, lang: code, raw: null })
      showNotify('Server error', 'err')
    }
  }, [key])

  return { lang: current.lang, langHtml: current.raw === null ? null : rendered, changeLang }
}

export function useWikiOrLegacyHtml(raw: string, options: Partial<WikiRenderOptions> = {}): string {
  const isHtml = looksLikeLegacyHtml(raw)
  const wikiHtml = useWikiHtml(isHtml ? '' : raw, options)
  return useMemo(
    () => (isHtml ? sanitizeLegacyHtml(raw) : wikiHtml),
    [isHtml, raw, wikiHtml],
  )
}

export const renderTalkHtml = (raw: string, renderer?: string): string => {
  const text = String(raw ?? '')
  if (!text) return ''
  const html = renderer === 'chat'
    ? renderChat(text)
    : renderWiki(text, wikiRenderOptions({
      ...RENDER_OPTIONS,
      literalTemplates: true,
    })).html
  return sanitizeRenderedHtml(html)
}

export const renderTalkSmallHtml = (
  raw: string,
  renderer: string | undefined,
  meta: { name: string; userUrl: string; time: string },
): string => {
  const body = renderTalkHtml(raw, renderer)
  return sanitizeRenderedHtml(
    `<a href="${sanitizeUrl(meta.userUrl)}" class="name">${escapeHtml(meta.name)}</a>`
    + body
    + `<span class="time">${escapeHtml(meta.time)}</span>`
    + '<span class="clear"></span>',
  )
}
