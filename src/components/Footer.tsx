import { useI18n } from '../i18n'
import { type ThemePreference } from './themeContext'
import { useTheme } from './useTheme'

type FooterLink = {
  label: string
  href: string
}

type FooterProps = {
  links: FooterLink[]
  showLanguageSelector?: boolean
  showThemeSelector?: boolean
}

function Footer({ links, showLanguageSelector = false, showThemeSelector = false }: FooterProps) {
  const { lang, setLang, t, locales } = useI18n()
  const { preference, setPreference } = useTheme()

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('theme.system') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'light', label: t('theme.light') },
  ]

  const renderLanguageSelector = () => {
    if (!showLanguageSelector) return null
    return (
      <div className="setting-block" aria-label={t('footer.languageHint')}>
        <span className="setting-label">{t('footer.language')}</span>
        <div className="toggle-group">
          {locales.map((locale) => (
            <button
              key={locale}
              className={`toggle-btn ${lang === locale ? 'active' : ''}`}
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

  const renderThemeSelector = () => {
    if (!showThemeSelector) return null
    return (
      <div className="setting-block" aria-label={t('footer.themeHint')}>
        <span className="setting-label">{t('footer.theme')}</span>
        <div className="toggle-group">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              className={`toggle-btn ${preference === option.value ? 'active' : ''}`}
              type="button"
              onClick={() => setPreference(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-row">
          <div className="footer-links">
            <span>{t('footer.links')}</span>
            {links.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
          {(showLanguageSelector || showThemeSelector) && (
            <div className="footer-settings">
              {renderLanguageSelector()}
              {renderThemeSelector()}
            </div>
          )}
        </div>
        <p className="footer-copy">{t('footer.copy')}</p>
      </div>
    </footer>
  )
}

export default Footer
