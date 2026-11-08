import { isValidElement, useEffect, useState, type ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { setNotifyListener, setGlobalLoadingListener } from '../lib/legacy'
import { LEGACY_GLOBAL_CSS, LEGACY_PAGE_CSS, LEGACY_SIMPLE_CSS } from '../styles/legacy'
import { t as i18nT } from '../i18n'

export type ShellProps = {
  /** base.html 两栏 / base_width.html 宽版 / base_simple.html 极简 */
  variant?: 'two-col' | 'wide' | 'simple'
  title?: string
  /** 页面级样式名，对应 src/styles/legacy/ 下的模块（由 Shell 声明式注入） */
  css?: string[]
  /** 页面标识，写到 <html data-page="...">，供同目录作用域样式（Xxx.css）使用 */
  page?: string
  contCls?: string
  chead?: ReactNode
  sidebar?: ReactNode
  ad?: ReactNode
  footerExtra?: ReactNode
  /** base_simple.html 的 #center > #content 骨架（该变体不加载 main.css） */
  simpleFrame?: boolean
  children: ReactNode
}

const SITE_TITLE = 'Malody - Cross-platform music game community'

/** 老站三套骨架的统一实现 */
export function Shell({
  variant = 'two-col',
  title,
  css = [],
  page,
  contCls = '',
  chead,
  sidebar,
  ad,
  footerExtra,
  simpleFrame = false,
  children,
}: ShellProps) {
  /* 声明式样式表：CSS 是构建时静态依赖（?inline），由 React 渲染 <style> 并由
     React 负责挂载/卸载，不再手写 link + 引用计数，也不再靠 link.disabled 关全局样式。
     顺序固定：全局基础（main.css 或 simple.css）→ css 数组顺序，避免不确定的级联。 */
  const stylesheets: Array<{ name: string; text: string }> = [
    { name: variant === 'simple' ? 'simple.css' : 'main.css',
      text: variant === 'simple' ? LEGACY_SIMPLE_CSS : LEGACY_GLOBAL_CSS },
    ...css
      .filter((name) => LEGACY_PAGE_CSS[name] !== undefined)
      .map((name) => ({ name, text: LEGACY_PAGE_CSS[name] })),
  ]
  const styleNodes = stylesheets.map((sheet) => (
    <style key={sheet.name} data-legacy-css={sheet.name}>{sheet.text}</style>
  ))

  useEffect(() => {
    document.title = title ? `Malody - ${title}` : SITE_TITLE
  }, [title])

  /* 同目录的页面样式用 html[data-page="..."] 限定作用域；这里由 Shell 统一写入，
     页面组件只需要声明 page prop，不各自操作 DOM。卸载时清掉，避免串到下一页。 */
  useEffect(() => {
    const root = document.documentElement
    if (page) {
      root.setAttribute('data-page', page)
      return () => { root.removeAttribute('data-page') }
    }
    root.removeAttribute('data-page')
  }, [page])

  const [notice, setNotice] = useState<{ msg: string; type: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => setNotifyListener((msg, type) => {
    setNotice({ msg, type })
    window.setTimeout(() => setNotice(null), 2000)
  }), [])
  useEffect(() => setGlobalLoadingListener(setBusy), [])

  /* 老站 base.html:58-66 的 window.onresize：视口比内容高时把 footer 贴视口底。
     SPA 异步取数后 body 会变高，若只在挂载 / resize 时算一次，footer 仍按旧高度
     absolute 定位，长页面就会被它盖住。这里跟着内容尺寸变化重算，并且内容变长时
     改成 relative 跟随文档流（absolute + bottom:0 是遮挡的根因）。
     只在结论变化时写 DOM，避免 ResizeObserver 自身造成回环。 */
  useEffect(() => {
    const footer = document.getElementById('footer')
    if (!footer) return
    let last = ''
    const place = () => {
      const short = window.innerHeight > document.body.clientHeight
      const position = short ? 'fixed' : 'relative'
      const bottom = short ? '0' : 'auto'
      const key = `${position}|${bottom}`
      if (key === last) return
      last = key
      footer.style.position = position
      footer.style.bottom = bottom
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('load', place)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    observer?.observe(document.body)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('load', place)
      observer?.disconnect()
    }
  }, [variant])

  if (variant === 'simple') {
    // children 已自带 #center 骨架（如 DDoS 沿用旧写法）时不再重复包裹，避免同名 id 嵌套。
    const framed = simpleFrame && !(isValidElement(children) && (children.props as { id?: string })?.id === 'center')
    const content = framed
      ? <div id="center"><div id="content">{children}</div></div>
      : children
    return (
      <>
        {styleNodes}
        {content}
        <NotifyLayer notice={notice} />
      </>
    )
  }

  return (
    <>
      {styleNodes}
      <Header />
      {variant === 'wide' && <div id="chead">{chead}</div>}
      <div id="center">
        <div id="content" className={contCls} style={variant === 'wide' ? { width: '100%' } : undefined}>
          {children}
        </div>
        {variant === 'two-col' && <div id="sidebar">{sidebar}</div>}
        {variant === 'two-col' && <div id="ad">{ad}</div>}
        <span className="clear"></span>
      </div>
      <Footer extra={footerExtra} />
      <NotifyLayer notice={notice} />
      <div id="g_loading" style={{ display: busy ? 'block' : 'none' }}>
        <div className="loading"></div>
        <span>Wait...</span>
      </div>
    </>
  )
}

function NotifyLayer({ notice }: { notice: { msg: string; type: string } | null }) {
  // 老站 main.css:1523 #notify 默认 bottom:-32px;display:none，
  // util.js:211 showAlert 用 animate 把 bottom 滑到 0；这里用 inline style 直接置 0。
  return (
    <div id="notify" style={{ display: notice ? 'block' : 'none', bottom: notice ? 0 : undefined }}>
      <div className={`msg ${notice?.type ?? 'succ'}`}><p>{notice?.msg}</p></div>
    </div>
  )
}

/** 老站 widget/default_side.html */
export function DefaultSidebar() {
  return (
    <>
      <a href="/">Home</a>
      <a href="/page/latest">{i18nT('Recent Changes')}</a>
      <a href="/page/all/cate">Categories</a>
      <a href="/page/all">Contents</a>
      <a href="/page/create">{i18nT('New Article')}</a>
    </>
  )
}
