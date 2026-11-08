import { useEffect, useMemo, useState } from 'react'
import { fetchWikiTemplate, type RespWikiTemplate } from '../network/api'
import { t as i18nT } from '../i18n'
import {
  renderWiki, renderChat, wikiRenderOptions, escapeHtml, sanitizeUrl, sanitizeRenderedHtml,
  looksLikeLegacyHtml, sanitizeLegacyHtml,
  type WikiTemplate, type WikiRenderOptions,
} from './wiki'
import { renderTemplateHtml, applyTemplateHtml } from './wikiTemplates'

/* ------------------------------------------------------------------ *
 * 老站 lib/woc2baka.py translate(raw, False) + lib/w2b_template.py
 * parse_all_template() 的服务端两段落库/读取链路，统一搬到前端：
 * 接口只返回 raw，前端现算安全 HTML。
 *
 * 按需求不移植 use_magic_power=True（is_admin 放行原文 HTML）分支，
 * 所有 wiki 文本一律先 escape 再由标记语法生成可信标签。
 *
 * 全站 wiki 文本（普通页 / 歌曲 / 谱面 / 用户主页 / 多语言 / 模板 / 预览 /
 * 讨论 / 私信）都必须经过这里，禁止把服务端 html 字段直接塞进 innerHTML。
 * ------------------------------------------------------------------ */

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

/** 模板正文里的业务参数 uid/key 与全局鉴权参数同名，发请求前改名，后端按新名读取。 */
const TEMPLATE_PARAM_ALIAS: Record<string, string> = { uid: 'touid', key: 'tmplKey' }
const templateQuery = (params: Record<string, string>): Record<string, string> => {
  const q: Record<string, string> = {}
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'name') return
    q[TEMPLATE_PARAM_ALIAS[k] ?? k] = v
  })
  return q
}

/** 复刻 wikipage.views.page_wiki：正文若是一个飞书文档链接，则整体换成 iframe */
export function wikiToHtml(
  raw: string,
  options: Partial<WikiRenderOptions> = {},
): { html: string; templates: WikiTemplate[] } {
  const text = String(raw ?? '')
  const r = renderWiki(text, wikiRenderOptions({ ...RENDER_OPTIONS, ...options }))
  // 输出兜底：所有 URL 型属性再过一次协议白名单，覆盖未来新增的语法分支
  const html = sanitizeRenderedHtml(r.html)
  if (html.startsWith(FEISHU_PREFIX)) {
    const url = sanitizeUrl(html.replace(/<\/?p>/g, '').trim())
    // 只允许固定飞书域名的干净路径；正文里夹带的引号/空白会让 src 失效，
    // 虽然 escapeHtml 已保证不能逃逸属性，但不应把垃圾 URL 塞进 iframe。
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

/** 用渲染器输出正文，并把 {{...}} 模板占位异步补成真实内容块 */
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
  const [html, setHtml] = useState<string>(result.html)
  useEffect(() => {
    let alive = true
    if (!result.templates.length) {
      setHtml(result.html)
      return
    }
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
      // 模板块是异步插入的，替换完成后再兜一次底（blocks 自身已在 renderTemplateHtml 出口过滤）
      if (alive) setHtml(sanitizeRenderedHtml(applyTemplateHtml(result.html, blocks)))
    })()
    return () => { alive = false }
  }, [result])
  return html
}

/**
 * 字段可能是 wiki raw，也可能是老站落库的已翻译 HTML（如皮肤简介 desc）。
 * 以标签开头时按 HTML 走白名单清洗（sanitizeLegacyHtml），否则按 wiki 渲染。
 * 与其它入口一样由这里产出可注入的 HTML，页面不直接调用清洗函数。
 */
export function useWikiOrLegacyHtml(raw: string, options: Partial<WikiRenderOptions> = {}): string {
  const isHtml = looksLikeLegacyHtml(raw)
  const wikiHtml = useWikiHtml(isHtml ? '' : raw, options)
  return useMemo(
    () => (isHtml ? sanitizeLegacyHtml(raw) : wikiHtml),
    [isHtml, raw, wikiHtml],
  )
}

/**
 * 讨论 / 评论 / 私信：老站 plugin.views.save_talk 用完整 woc2baka.translate()，
 * 老站 talk_item 用精简 w2b_chat.translate()。两者都由前端按 raw 现算。
 * renderer 由 Go 的 talkItemMap 给出；缺失时按完整 wiki 渲染。
 */
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

/**
 * type=1 自动消息（点赞/推荐、活动提示）对应老站 talk/like.tmpl.html：
 * 模板把 translate() 的结果（单个 <p>…</p>）直接插进 .g_wiki.meta，
 * main.css 再把这个 p 设为 inline-block，与用户名、时间同处一行。
 *
 * v3 早期用 <div dangerouslySetInnerHTML> 包了一层，div 是块级元素：
 * 用户名 / 描述 / 时间被拆成三行，而 .meta 只有固定 16px 高，
 * 描述和时间就溢到白块外的灰底上。这里按老站结构一次拼好 innerHTML，
 * 用户名、时间、链接全部先转义，正文仍只来自前端可信渲染器。
 */
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
