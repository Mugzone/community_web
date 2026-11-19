import { isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { setNotifyListener } from '../lib/notify'
import { t as i18nT } from '../i18n'

export type ShellProps = {
  variant?: 'two-col' | 'wide' | 'simple'
  title?: string
  css?: string[]
  page?: string
  contCls?: string
  chead?: ReactNode
  sidebar?: ReactNode
  ad?: ReactNode
  footerExtra?: ReactNode
  simpleFrame?: boolean
  children: ReactNode
}

const SITE_TITLE = 'Malody - Cross-platform music game community'

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
  const stylesAttr = [
    variant === 'simple' ? 'simple' : 'main',
    ...(page ? [page] : []),
    ...css.map((name) => name.replace(/\.css$/, '')),
  ].filter(Boolean).join(' ')

  useEffect(() => {
    document.title = title ? `Malody - ${title}` : SITE_TITLE
  }, [title])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-styles', stylesAttr)
    return () => { root.removeAttribute('data-styles') }
  }, [stylesAttr])

  const [notice, setNotice] = useState<{ msg: string; type: string } | null>(null)
  const notifyTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const off = setNotifyListener((msg, type) => {
      setNotice({ msg, type })
      if (notifyTimer.current !== undefined) window.clearTimeout(notifyTimer.current)
      notifyTimer.current = window.setTimeout(() => {
        notifyTimer.current = undefined
        setNotice(null)
      }, 2000)
    })
    return () => {
      off()
      if (notifyTimer.current !== undefined) window.clearTimeout(notifyTimer.current)
      notifyTimer.current = undefined
    }
  }, [])

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
    </>
  )
}

function NotifyLayer({ notice }: { notice: { msg: string; type: string } | null }) {
  return (
    <div id="notify" style={{ display: notice ? 'block' : 'none', bottom: notice ? 0 : undefined }}>
      <div className={`msg ${notice?.type ?? 'succ'}`}><p>{notice?.msg}</p></div>
    </div>
  )
}

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
