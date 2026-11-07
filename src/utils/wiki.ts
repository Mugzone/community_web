const BlockMode = {
  None: 0,
  List: 1,
  Table: 2,
  Org: 3,
  Block: 4,
  Template: 5,
} as const

type BlockMode = (typeof BlockMode)[keyof typeof BlockMode]

export type WikiTemplate = {
  name: string
  params: Record<string, string>
}

export type WikiRenderResult = {
  html: string
  templates: WikiTemplate[]
}

export type WikiRenderOptions = {
  hiddenLabel: string
  templateLabel: string
  templateLoading: string
  /** 老站 preview 的 conf={"ignore_tmpl": True}：{{ }} 模板块整段不输出 */
  ignoreTemplates?: boolean
  /** 讨论/私信不解析业务模板：{{ ... }} 按老站 translate() 原样转义成文本 */
  literalTemplates?: boolean
}

/** 老站 lib/woc2baka.py translate() 的默认标签文案；页面侧可覆盖成 i18n 文案 */
export const DEFAULT_WIKI_OPTIONS: WikiRenderOptions = {
  hiddenLabel: 'Click to display',
  templateLabel: 'Template',
  templateLoading: 'Loading template...',
}

export const bindHiddenToggles = (container: HTMLElement | null) => {
  if (!container) return () => {}
  const handleClick = (event: Event) => {
    const target = event.target as HTMLElement | null
    const hiddenTrigger = target?.closest?.('.hide-top')
    if (!hiddenTrigger || !container.contains(hiddenTrigger)) return
    const wrapper = hiddenTrigger.closest('.hidden')
    wrapper?.classList.toggle('open')
  }
  container.addEventListener('click', handleClick)
  return () => {
    container.removeEventListener('click', handleClick)
  }
}

/** 老站 cgi.escape(line, quote=True) 后再把 ' 换成 &#039; */
export const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const clamp = (value: number, max = 700, min = 0) => Math.min(Math.max(value, min), max)

/* 按需求只移植 translate(raw, False)：任何 wiki 文本（含 """ 原文块）一律
 * 先 escape 再由标记语法生成可信标签，不保留老站 is_admin 的原文 HTML 特权。 */

/** 老站 lib/w2b_chat.py translate()：私信/自动消息用的精简行内渲染器 */
export const renderChat = (raw: string): string => {
  let line = escapeHtml(String(raw ?? ''))
  line = line.replace(/\[img:([^\s\]]+)\]/gi, (_m, url: string) =>
    `<img src="${url.replace(/&amp;/g, '&')}" style="width:300px"/>`)
  line = line.replace(/\[((?:https?):\/\/[^\s\]]+)\s+([^\]]+)\]/gi, (_m, href: string, label: string) =>
    `<a href="${href.replace(/&amp;/g, '&')}">${label}</a>`)
  // 同 w2b_chat.py:8-12，字符类允许内容含标记字符本身
  line = line.replace(/\*\*\s*([\s\S]+?)\s*\*\*/g, '<b>$1</b>')
  line = line.replace(/http:\/\//g, '____http____').replace(/https:\/\//g, '____https____')
  line = line.replace(/\/\/\s*([\s\S]+?)\s*\/\//g, '<i>$1</i>')
  line = line.replace(/____http____/g, 'http://').replace(/____https____/g, 'https://')
  line = line.replace(/__\s*([\s\S]+?)\s*__/g, '<u>$1</u>')
  line = line.replace(/--\s*([\s\S]+?)\s*--/g, '<s>$1</s>')
  return `<p>${line}</p>`
}

const parseInnerMark = (rawLine: string, { newLine = false, autoFloat = true } = {}) => {
  let line = escapeHtml(rawLine)

  const imageRegex = /\[img:([^@\s\]]+)(@(left|right|center))?(@(\d{1,3}))?\]/i
  let imageMatch = line.match(imageRegex)
  while (imageMatch) {
    // 老站 Python str.replace 替换全部；JS 传字符串只替换首个，URL 多 & 时会残留 &amp;
    const url = imageMatch[1].replace(/&amp;/g, '&')
    let align = imageMatch[3] ?? ''
    let size = imageMatch[5]
    if (align && /^\d+$/.test(align)) {
      size = align
      align = 'right'
    }
    const width = clamp(size ? Number(size) : 240)
    let replacement = ''
    if (autoFloat) {
      if (align === 'center') {
        replacement = `<div style="text-align:center"><img class="nobd" src="${url}" style="width:${width}px"/></div>`
      } else if (align) {
        replacement = `<img src="${url}" class="${align}" style="width:${width}px"/>`
      } else {
        replacement = `<img src="${url}" style="width:${width}px"/>`
      }
    } else {
      replacement = `<img src="${url}" style="width:${width}px"/>`
    }
    line = line.replace(imageRegex, replacement)
    imageMatch = line.match(imageRegex)
  }

  const videoRegex = /\[video:([^@\s\]]+)(@(left|right|center))?(@(\d{1,3}))?(@(\d{1,3}))?\]/i
  let videoMatch = line.match(videoRegex)
  while (videoMatch) {
    const url = videoMatch[1].replace(/&amp;/g, '&')
    let align = videoMatch[3] ?? ''
    let width = videoMatch[5]
    let height = videoMatch[7]
    if (align && /^\d+$/.test(align)) {
      height = width
      width = align
      align = ''
    }
    const w = clamp(width ? Number(width) : 400)
    const h = clamp(height ? Number(height) : 320)
    const body = `<iframe src="${url}" width="${w}" height="${h}" loading="lazy" allowfullscreen frameborder="0"></iframe>`
    if (autoFloat) {
      if (align === 'center') {
        line = line.replace(videoRegex, `<div style="text-align:center">${body}</div>`)
      } else if (align) {
        line = line.replace(videoRegex, `<div class="${align}">${body}</div>`)
      } else {
        line = line.replace(videoRegex, body)
      }
    } else {
      line = line.replace(videoRegex, body)
    }
    videoMatch = line.match(videoRegex)
  }

  const exLinkRegex = /\[(xiami|soundcloud|youtube|bili):(.+)\]/i
  let exLinkMatch = line.match(exLinkRegex)
  while (exLinkMatch) {
    const type = exLinkMatch[1].toLowerCase()
    const code = exLinkMatch[2]
    let replacement = ''
    if (type === 'xiami') {
      const src = `http://www.xiami.com/widget/0_${code}/singlePlayer.swf`
      replacement = `<embed src="${src}" width="257" height="33"/>`
    } else if (type === 'soundcloud') {
      const src = `http://player.soundcloud.com/player.swf?show_bpm=true&show_comments=false&url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F${code}`
      replacement = `<embed src="${src}" width="300" height="81"/>`
    } else if (type === 'youtube') {
      replacement = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${code}" frameborder="0" allowfullscreen loading="lazy"></iframe>`
    } else if (type === 'bili') {
      replacement = `<iframe src="//player.bilibili.com/player.html?bvid=${code}&page=1&high_quality=1" width="720" height="405" scrolling="no" frameborder="no" allowfullscreen="true"></iframe>`
    }
    line = line.replace(exLinkRegex, replacement)
    exLinkMatch = line.match(exLinkRegex)
  }

  const linkRegex = /\[((?:https?):\/\/[^\s]+)\s+([^\]]+)\]/i
  let linkMatch = line.match(linkRegex)
  while (linkMatch) {
    const href = linkMatch[1].replace(/&amp;/g, '&')
    const label = linkMatch[2] || href
    const replacement = `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`
    line = line.replace(linkRegex, replacement)
    linkMatch = line.match(linkRegex)
  }

  const styleRegex = /\[#([a-f0-9]{6}):([^\]]+)\]/i
  let styleMatch = line.match(styleRegex)
  while (styleMatch) {
    const color = styleMatch[1]
    const text = styleMatch[2]
    line = line.replace(styleRegex, `<span style="color:#${color};">${text}</span>`)
    styleMatch = line.match(styleRegex)
  }

  const innerIdRegex = /\[#(\d+)\s+([^\]]+)\]/i
  let innerIdMatch = line.match(innerIdRegex)
  while (innerIdMatch) {
    const target = innerIdMatch[1]
    const label = innerIdMatch[2] || target
    line = line.replace(innerIdRegex, `<a href="/wiki/${target}">${label}</a>`)
    innerIdMatch = line.match(innerIdRegex)
  }

  const innerLinkRegex = /\[#([^\s\]]+)\]/i
  let innerLinkMatch = line.match(innerLinkRegex)
  while (innerLinkMatch) {
    const keyword = innerLinkMatch[1]
    const link = `/page/?query=${encodeURIComponent(keyword)}`
    line = line.replace(innerLinkRegex, `<a href="${link}">${keyword}</a>`)
    innerLinkMatch = line.match(innerLinkRegex)
  }

  const emojiRegex = /\[:(\d{2})\]/i
  let emojiMatch = line.match(emojiRegex)
  while (emojiMatch) {
    const num = Number(emojiMatch[1])
    if (Number.isFinite(num) && num < 100) {
      line = line.replace(emojiRegex, `<em class="g_emo i${num}"></em>`)
    }
    emojiMatch = line.match(emojiRegex)
  }

  // 老站 woc2baka.py:26-29 的字符类是 ([^\1]+?)（\1 在字符类里是 0x01 控制符），
  // 实际含义是「允许内容里出现标记字符本身」。用 [^*]/[^/]/[^_]/[^-] 会让
  // //**粗体**//、__[链接]__（target="_blank" 含 _）、----文字---- 解析失败。
  const boldRegex = /\*\*\s*([\s\S]+?)\s*\*\*/g
  line = line.replace(boldRegex, '<b>$1</b>')

  line = line.replace(/http:\/\//g, '____http____').replace(/https:\/\//g, '____https____')
  const italicRegex = /\/\/\s*([\s\S]+?)\s*\/\//g
  line = line.replace(italicRegex, '<i>$1</i>')
  line = line.replace(/____http____/g, 'http://').replace(/____https____/g, 'https://')

  const underlineRegex = /__\s*([\s\S]+?)\s*__/g
  const strikeRegex = /--\s*([\s\S]+?)\s*--/g
  line = line.replace(underlineRegex, '<u>$1</u>')
  line = line.replace(strikeRegex, '<s>$1</s>')

  return newLine ? `<p>${line}</p>` : line
}

const parseList = (line: string) => {
  const body = line.replace(/^\*\s+/, '')
  return `<li>${parseInnerMark(body)}</li>`
}

const tableStyleRegex = {
  width: /@width:(\d+)/i,
  height: /@height:(\d+)/i,
  color: /@bg:([a-f0-9]{6})/i,
  fontColor: /@font:([a-f0-9]{6})/i,
  fontSize: /@size:(\d+)/i,
}

const parseTableRow = (line: string, { head = false } = {}) => {
  const pieces = line.trimEnd().endsWith('|') ? line.trimEnd().split('|') : `${line}|`.split('|')
  if (head && pieces.length < 2) return ''

  const tag = head ? 'th' : 'td'
  const row: string[] = []
  let span = 0

  pieces.forEach((cell) => {
    if (!cell.length) {
      span += 1
      return
    }

    let item = cell
    let style = ''
    const width = item.match(tableStyleRegex.width)?.[1]
    if (width) {
      style += `width:${width}px;`
      item = item.replace(tableStyleRegex.width, '')
    }

    const height = item.match(tableStyleRegex.height)?.[1]
    if (height) {
      style += `height:${height}px;`
      item = item.replace(tableStyleRegex.height, '')
    }

    const bg = item.match(tableStyleRegex.color)?.[1]
    if (bg) {
      style += `background-color:#${bg};`
      item = item.replace(tableStyleRegex.color, '')
    }

    const fontColor = item.match(tableStyleRegex.fontColor)?.[1]
    if (fontColor) {
      style += `color:#${fontColor};`
      item = item.replace(tableStyleRegex.fontColor, '')
    }

    const fontSize = item.match(tableStyleRegex.fontSize)?.[1]
    if (fontSize) {
      let sizeVal = Number(fontSize)
      if (sizeVal < 10) sizeVal = 10
      if (sizeVal > 30) sizeVal = 20
      style += `font-size:${sizeVal}px;`
      item = item.replace(tableStyleRegex.fontSize, '')
    }

    let align: 'l' | 'c' | 'r' = 'l'
    if (item.startsWith(' ') && item.endsWith(' ')) {
      align = 'c'
    } else if (!item.startsWith(' ')) {
      align = 'l'
    } else if (!item.endsWith(' ')) {
      align = 'r'
    }
    if (head) align = 'c'

    const trimmed = item.trim()
    const extra: string[] = []
    if (span > 0) {
      extra.push(`colspan="${span + 1}"`)
      span = 0
    }
    if (align) extra.push(`class="${align}"`)
    if (style) extra.push(`style="${style}"`)

    const parsed = parseInnerMark(trimmed, { autoFloat: false }).replace(/@newline/g, '<br/>')
    const extraStr = extra.join(' ').trim()
    const attrs = extraStr ? ` ${extraStr}` : ''
    row.push(`<${tag}${attrs}>${parsed}</${tag}>`)
  })

  if (span > 1) {
    row.push(`<${tag} colspan="${span - 1}"></${tag}>`)
  }

  return row.length ? `<tr>${row.join('')}</tr>` : ''
}

const parseTemplateBlock = (lines: string[]): WikiTemplate | null => {
  const params: Record<string, string> = {}
  lines.forEach((line) => {
    const idx = line.indexOf(':')
    if (idx === -1) return
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    if (key) params[key] = val
  })
  if (!params.name) return null
  const name = params.name
  delete params.name
  return { name, params }
}

const buildTemplatePlaceholder = (tmpl: WikiTemplate, idx: number, options: WikiRenderOptions) => {
  return `<div class="wiki-template-placeholder" data-template="${escapeHtml(tmpl.name)}" data-template-idx="${idx}"><p class="wiki-template-name">${options.templateLabel} ${escapeHtml(tmpl.name)}</p><p class="wiki-template-todo">${options.templateLoading}</p></div>`
}

export const renderWiki = (content: string, options: WikiRenderOptions): WikiRenderResult => {
  const lines = content.split(/\r?\n/)
  const output: string[] = []
  const templates: WikiTemplate[] = []
  let mode: BlockMode = BlockMode.None
  let inHidden = false
  let inTemplate = false
  let templateLines: string[] = []
  let tableMode: 'default' | 'right' | 'floatRight' = 'default'

  const openMode = (next: BlockMode, line?: string) => {
    mode = next
    if (next === BlockMode.List) {
      output.push('<ul>')
    } else if (next === BlockMode.Table) {
      tableMode = 'default'
      if (line?.includes('fright')) {
        output.push("<table style='float:right'><tbody>")
        tableMode = 'floatRight'
      } else if (line?.includes('right')) {
        output.push("<div style='float:right'><table><tbody>")
        tableMode = 'right'
      } else if (line?.includes('center')) {
        output.push("<table class='c'><tbody>")
      } else {
        output.push('<table><tbody>')
      }
    } else if (next === BlockMode.Block) {
      output.push('<blockquote>')
    }
  }

  const closeMode = () => {
    if (mode === BlockMode.List) {
      output.push('</ul>')
    } else if (mode === BlockMode.Table) {
      if (tableMode === 'right') {
        output.push("</tbody></table></div><span class='clear'></span>")
      } else {
        output.push('</tbody></table>')
      }
    } else if (mode === BlockMode.Block) {
      output.push('</blockquote>')
    }
    mode = BlockMode.None
  }

  lines.forEach((rawLine) => {
    const line = rawLine ?? ''
    if (line === '') {
      if (mode !== BlockMode.None) {
        closeMode()
      }
      return
    }

    if (mode === BlockMode.List && !line.startsWith('* ')) {
      closeMode()
    } else if (mode === BlockMode.Table && !line.startsWith('|')) {
      closeMode()
    }

    if (!inTemplate && mode === BlockMode.None && line.startsWith('"""')) {
      mode = BlockMode.Org
      return
    }
    if (!inTemplate && mode === BlockMode.None && line.startsWith('~~~')) {
      openMode(BlockMode.Block)
      return
    }
    if (!inTemplate && mode === BlockMode.None && line.startsWith('|-')) {
      openMode(BlockMode.Table, line)
      return
    }
    if (!inTemplate && line === '{{') {
      if (mode !== BlockMode.None) {
        closeMode()
      }
      inTemplate = true
      templateLines = []
      // 老站 translate() 默认把 {{ 本身 escape 后写进 ret（讨论里就是字面文本）
      if (options.literalTemplates) output.push(escapeHtml(line))
      return
    }

    if (line === '#hidden') {
      if (!inHidden) {
        output.push(`<div class="hidden"><span class="hide-top">${options.hiddenLabel}</span><div class="hide-body">`)
        inHidden = true
      }
      return
    }
    if (line === '#end' && inHidden) {
      output.push('</div></div>')
      inHidden = false
      return
    }

    if (inTemplate) {
      if (options.literalTemplates) {
        output.push(escapeHtml(line))
        if (line === '}}') inTemplate = false
        return
      }
      if (line === '}}') {
        inTemplate = false
        const tmpl = parseTemplateBlock(templateLines)
        if (tmpl) {
          // 老站 conf={"ignore_tmpl": True}：预览时模板块整段不输出
          if (!options.ignoreTemplates) templates.push(tmpl)
          if (!options.ignoreTemplates) {
            output.push(buildTemplatePlaceholder(tmpl, templates.length - 1, options))
          }
        }
      } else {
        templateLines.push(line)
      }
      return
    }

    if (mode === BlockMode.None || mode === BlockMode.Block) {
      if (line === '~~~' && mode === BlockMode.Block) {
        closeMode()
        return
      }

      if (line.startsWith('=') && mode === BlockMode.None) {
        const prefix = line.match(/^(=*)/)?.[1] ?? ''
        const level = Math.min(prefix.length, 4)
        const text = line.replace(/^[=\s]*|[=\s]*$/g, '')
        // 老站正文标题就是纯 <hN>，无 id、无目录、无编号
        output.push(`<h${level}>${escapeHtml(text)}</h${level}>`)
        return
      }

      if (line.startsWith('* ')) {
        openMode(BlockMode.List)
        output.push(parseList(line))
        return
      }

      if (mode === BlockMode.None && line === '"""') {
        mode = BlockMode.Org
        return
      }

      output.push(parseInnerMark(line, { newLine: true }))
      return
    }

    if (mode === BlockMode.Org) {
      if (line === '"""') {
        mode = BlockMode.None
        return
      }
      // 老站 MODE_ORG 的非管理员分支：只做 html escape，不做任何标记解析
      output.push(`<p>${escapeHtml(line)}</p>`)
      return
    }

    if (mode === BlockMode.List) {
      output.push(parseList(line))
      return
    }

    if (mode === BlockMode.Table) {
      if (line.startsWith('|!')) {
        output.push(parseTableRow(line.slice(2), { head: true }))
      } else if (line.startsWith('|-')) {
        // ignore divider
      } else if (line.startsWith('|')) {
        output.push(parseTableRow(line.slice(1)))
      }
      return
    }
  })

  if (mode !== BlockMode.None) {
    closeMode()
  }
  if (inTemplate && templateLines.length && !options.ignoreTemplates) {
    const tmpl = parseTemplateBlock(templateLines)
    if (tmpl) {
      const idx = templates.length
      templates.push(tmpl)
      output.push(buildTemplatePlaceholder(tmpl, idx, options))
    }
  }
  if (inHidden) {
    output.push('</div></div>')
  }

  return { html: output.join(''), templates }
}

/** 全站统一入口：老站 translate() 保存时生成的 html 现在一律由前端按 raw 现算。 */
export const wikiRenderOptions = (
  options: Partial<WikiRenderOptions> = {},
): WikiRenderOptions => ({ ...DEFAULT_WIKI_OPTIONS, ...options })

/** 只取 HTML 的便捷入口（讨论、预览、编辑页等不需要异步模板块的场景） */
export const renderWikiText = (raw: string, options: Partial<WikiRenderOptions> = {}): string =>
  renderWiki(String(raw ?? ''), wikiRenderOptions(options)).html
