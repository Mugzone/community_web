import { useEffect, useMemo, useState } from 'react'
import { fetchWikiTemplate, type RespWikiTemplate } from '../network/api'
import { t as i18nT } from '../i18n'
import {
  renderWiki, renderChat, wikiRenderOptions,
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
  if (r.html.startsWith(FEISHU_PREFIX)) {
    const url = r.html.replace(/<\/?p>/g, '').trim()
    return {
      html: `<iframe width="100%" height="1145px" frameborder="0" seamless src="${url}"></iframe>`,
      templates: [],
    }
  }
  return { html: r.html, templates: r.templates }
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
      if (alive) setHtml(applyTemplateHtml(result.html, blocks))
    })()
    return () => { alive = false }
  }, [result])
  return html
}

/**
 * 讨论 / 评论 / 私信：老站 plugin.views.save_talk 用完整 woc2baka.translate()，
 * 老站 talk_item 用精简 w2b_chat.translate()。两者都由前端按 raw 现算。
 * renderer 由 Go 的 talkItemMap 给出；缺失时按完整 wiki 渲染。
 */
export const renderTalkHtml = (raw: string, renderer?: string): string => {
  const text = String(raw ?? '')
  if (!text) return ''
  if (renderer === 'chat') return renderChat(text)
  return renderWiki(text, wikiRenderOptions({
    ...RENDER_OPTIONS,
    literalTemplates: true,
  })).html
}
