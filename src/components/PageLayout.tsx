import type { ReactNode } from 'react'
import Footer from './Footer'
import Topbar from './Topbar'
import { siteFooterLinks } from './siteLinks'

type FooterLink = {
  label: string
  href: string
}

type PageLayoutProps = {
  children: ReactNode
  className?: string
  topbarProps: Parameters<typeof Topbar>[0]
  footerLinks?: FooterLink[]
  showLanguageSelector?: boolean
  showThemeSelector?: boolean
}

function PageLayout({
  children,
  className,
  topbarProps,
  footerLinks = siteFooterLinks,
  showLanguageSelector = true,
  showThemeSelector = true,
}: PageLayoutProps) {
  return (
    <div className={`page${className ? ` ${className}` : ''}`}>
      <Topbar {...topbarProps} />
      <div className="page-content">
        {children}
      </div>
      <Footer links={footerLinks} showLanguageSelector={showLanguageSelector} showThemeSelector={showThemeSelector} />
    </div>
  )
}

export default PageLayout
