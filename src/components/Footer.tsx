import { useI18n } from '../i18n'

type FooterLink = {
  label: string
  href: string
}

type FooterProps = {
  links: FooterLink[]
  showLanguageSelector?: boolean
}

function Footer({ links, showLanguageSelector = false }: FooterProps) {
  const { lang, setLang, t, locales } = useI18n()

  const renderLanguageSelector = () => {
    if (!showLanguageSelector) return null
    return (
      <div className="language-switch" aria-label={t('footer.languageHint')}>
        <span className="language-label">{t('footer.language')}</span>
        <div className="language-options">
          {locales.map((locale) => (
            <button
              key={locale}
              className={`lang-btn ${lang === locale ? 'active' : ''}`}
              type="button"
              onClick={() => setLang(locale)}
            >
              {t(`language.${locale}`)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <footer className="footer">
      <div className="footer-row">
        <div className="footer-links">
          <span>{t('footer.links')}</span>
          {links.map((item) => (
            <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          ))}
        </div>
        {renderLanguageSelector()}
      </div>
      <p className="footer-copy">{t('footer.copy')}</p>
    </footer>
  )
}

export default Footer
