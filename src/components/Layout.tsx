import { isValidElement, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { setNotifyListener, setGlobalLoadingListener } from '../lib/legacy'
import { t as i18nT } from '../i18n'

export type ShellProps = {
  /** base.html 两栏 / base_width.html 宽版 / base_simple.html 极简 */
  variant?: 'two-col' | 'wide' | 'simple'
  title?: string
  /** 共享样式名（src/styles/pages/*.css），会并入 <html data-styles> */
  css?: string[]
  /** 页面独有用样式名，对应组件同目录的 Xxx.css */
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
  /* 所有 CSS 都由 src/styles/index.css 静态打包，规则用
     html[data-styles~="name"] 限定作用域。Shell 只负责把本页需要的样式名
     写进 <html data-styles="...">，不再渲染 <style> 或操作 link。
     ~= 支持一页同时激活多个样式（如 "main wiki tmpl"）。 */
  const stylesAttr = [
    variant === 'simple' ? 'simple' : 'main',
    ...(page ? [page] : []),
    ...css.map((name) => name.replace(/\.css$/, '')),
  ].filter(Boolean).join(' ')

  useEffect(() => {
    document.title = title ? `Malody - ${title}` : SITE_TITLE
  }, [title])

  // 必须在首帧绘制前写入：useEffect 在绘制之后才执行，首帧没有任何
  // html[data-styles~=...] 规则生效，图片按原尺寸闪一下（几乎所有页面都会出现）。
  // 切换页面时旧 Shell 的清理和新 Shell 的写入也都在绘制前完成，中间不会出现无样式帧。
  useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-styles', stylesAttr)
    return () => { root.removeAttribute('data-styles') }
  }, [stylesAttr])

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
        {content}
        <NotifyLayer notice={notice} />
      </>
    )
  }

  return (
    <>
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
