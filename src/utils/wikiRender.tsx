import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchWikiTemplate, type RespWikiTemplate } from '../network/api'
import { fetchWikiLang } from '../network/pageWeb'
import { showNotify } from '../lib/notify'
import { t as i18nT } from '../i18n'
import {
  renderWiki, renderChat, wikiRenderOptions, escapeHtml, sanitizeUrl, sanitizeRenderedHtml,
  looksLikeLegacyHtml, sanitizeLegacyHtml, detectWikiLang, isWikiLang, resolveAutoWikiLang,
  type WikiTemplate, type WikiRenderOptions, type WikiLang,
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

type LangSelection = { key: string; lang: WikiLang; raw: string | null }

type WikiLangResp = { text: string; strict: boolean }

const readWikiLangResp = (resp: unknown): WikiLangResp => {
  const pack = (resp ?? {}) as { data?: unknown; strict?: boolean }
  return {
    text: typeof pack.data === 'string' ? pack.data : '',
    strict: pack.strict === true,
  }
}

/**
 * 后端 strict=1 会明确返回「该语言自己的正文」（缺失即空）。
 * 旧后端忽略 strict、仍回退英文，用英文正文比对识别这种回退，
 * 避免把英文内容挂到该语言标签下，也避免漏掉创建入口。
 */
const resolveLangText = (target: WikiLangResp, english: string, lang: WikiLang): string => {
  if (target.strict || lang === 'en' || target.text === '') return target.text
  return target.text === english ? '' : target.text
}

/** 老站 util.changeUrlLang：切换语言后写进 URL，刷新/复制链接仍停留在同一语言。 */
const syncWikiLangUrl = (code: WikiLang): void => {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('lang', code)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    // 非浏览器环境（SSR / 冒烟测试）忽略
  }
}

const browserWikiLang = (): { lang: WikiLang; explicit: boolean } => {
  try {
    return detectWikiLang({
      search: window.location.search,
      hostname: window.location.hostname,
      stored: localStorage.getItem('malody.lang'),
      locales: [navigator.language, ...(navigator.languages ?? [])],
    })
  } catch {
    return { lang: 'en', explicit: false }
  }
}

export function useWikiLang(key: string): {
  lang: string
  langHtml: string | null
  changeLang: (code: string) => Promise<void>
} {
  const [selection, setSelection] = useState<LangSelection>({ key, lang: 'en', raw: null })
  const current: LangSelection = selection.key === key ? selection : { key, lang: 'en', raw: null }
  const reqRef = useRef(0)
  const userChosenRef = useRef(false)
  const rendered = useWikiHtml(current.raw ?? '')

  // 首屏按浏览器语言选一个「有值」的正文：对齐老站 page_wiki 的
  // get_wiki(key_<request.LANG>)，该语言没有正文就继续显示英文 + English 标签；
  // URL 显式指定语言时即使没译文也停留在该语言并显示空白，方便点编辑写文。
  useEffect(() => {
    userChosenRef.current = false
    if (!key) return
    const { lang, explicit } = browserWikiLang()
    if (lang === 'en') return // 首屏 fetchWiki(lang: 0) 已经是英文正文
    const req = ++reqRef.current
    void (async () => {
      try {
        const [resp, enResp] = await Promise.all([
          fetchWikiLang(key, lang, true),
          fetchWikiLang(key, 'en', true),
        ])
        if (req !== reqRef.current || userChosenRef.current) return
        const raw = resolveLangText(readWikiLangResp(resp), readWikiLangResp(enResp).text, lang)
        const resolved = resolveAutoWikiLang(raw, lang, explicit)
        if (resolved) setSelection({ key, ...resolved })
      } catch {
        // 自动选择失败时保持英文默认，不打扰用户
      }
    })()
    return () => { reqRef.current += 1 }
  }, [key])

  const changeLang = useCallback(async (code: string): Promise<void> => {
    const lang: WikiLang = isWikiLang(code) ? code : 'en'
    const req = ++reqRef.current
    userChosenRef.current = true
    // 请求期间不留上一语言的正文，没译文时直接停在空白 + 创建入口。
    setSelection({ key, lang, raw: '' })
    syncWikiLangUrl(lang)
    try {
      const target = readWikiLangResp(await fetchWikiLang(key, lang, true))
      let raw = target.text
      if (!target.strict && lang !== 'en' && raw !== '') {
        const english = readWikiLangResp(await fetchWikiLang(key, 'en', true)).text
        if (req !== reqRef.current) return
        raw = raw === english ? '' : raw
      }
      if (req !== reqRef.current) return
      setSelection({ key, lang, raw })
    } catch {
      if (req !== reqRef.current) return
      setSelection({ key, lang, raw: null })
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
