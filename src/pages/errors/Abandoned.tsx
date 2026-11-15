import { useEffect, useState, type ReactNode } from 'react'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { URLS } from '../../lib/urls'
import { t as i18nT } from '../../i18n'

export default function Abandoned({
  title = '该页面已停用',
  message = 'This page is no longer available.',
  backHref = URLS.index,
  children,
}: {
  title?: string
  message?: string
  backHref?: string
  children?: ReactNode
}) {
  return (
    <Shell variant="two-col" title="Page abandoned" css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">{title}</div>
      <div className="g_cont">
        <div className="g_memo"><span className="g_round">{message}</span></div>
        {children}
        <p><a className="g_btn" href={backHref}>Back to home</a></p>
      </div>
    </Shell>
  )
}

const DISCORD_URL = 'https://discord.gg/unk9hgF'
const TAPTAP_URL = 'https://www.taptap.com/app/10115/topic'

const resolveTarget = (): string => {
  let lang = ''
  try {
    lang = localStorage.getItem('malody.lang') ?? navigator.language ?? ''
  } catch {
    lang = typeof navigator !== 'undefined' ? navigator.language : ''
  }
  return lang.toLowerCase().startsWith('zh') ? TAPTAP_URL : DISCORD_URL
}

export function LegacyRedirect({ autoRedirect = false }: { autoRedirect?: boolean }) {
  const [target] = useState<string>(resolveTarget)

  useEffect(() => {
    if (!autoRedirect) return
    window.location.replace(target)
  }, [autoRedirect, target])

  const go = (url: string, _name: string) => {
    window.location.href = url
  }

  return (
    <Shell variant="two-col" title={i18nT('Talk')} css={['akari.css']} sidebar={<DefaultSidebar />}>
      <div className="g_title">{i18nT('Talk')}</div>
      <div className="g_cont">
        <div className="g_memo"><span className="g_round">Talk has moved out of the community site.</span></div>
        <p>Please continue the discussion on our official channels:</p>
        <p>
          <a
            className="g_btn"
            href={DISCORD_URL}
            onClick={(e) => { e.preventDefault(); go(DISCORD_URL, 'Discord') }}
          >Discord{target === DISCORD_URL ? ' (Recommended)' : ''}</a>
          <a
            className="g_btn"
            href={TAPTAP_URL}
            onClick={(e) => { e.preventDefault(); go(TAPTAP_URL, 'TapTap') }}
          >TapTap{target === TAPTAP_URL ? ' (Recommended)' : ''}</a>
        </p>
      </div>
    </Shell>
  )
}
