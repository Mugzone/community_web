import { useI18n } from '../i18n'

type TopbarProps = {
  onSignIn: () => void
  onSignUp: () => void
  onSignOut?: () => void
  userName?: string
}

const navLinks = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.charts', href: '/all_chart' },
  { labelKey: 'nav.wiki', href: '/all_page' },
  { labelKey: 'nav.events', href: '/score/event' },
  { labelKey: 'nav.players', href: '/page/all/player' },
  { labelKey: 'nav.talk', href: 'https://discord.gg/unk9hgF' },
]

function Topbar({ onSignIn, onSignUp, onSignOut, userName }: TopbarProps) {
  const { t } = useI18n()

  return (
    <div className="topbar">
      <div className="topbar-left">
        <a className="brand" href="/">
          Malody
        </a>
        <nav>
          {navLinks.map((item) => (
            <a key={item.labelKey} href={item.href}>
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
      </div>
      <div className="topbar-actions">
        {userName ? (
          <>
            <span className="user-pill">{t('topbar.hi', { name: userName })}</span>
            <button className="btn ghost small" type="button" onClick={onSignOut}>
              {t('topbar.signOut')}
            </button>
          </>
        ) : (
          <>
            <button className="link btn-ghost" type="button" onClick={onSignIn}>
              {t('topbar.signIn')}
            </button>
            <button className="btn primary small" type="button" onClick={onSignUp}>
              {t('topbar.signUp')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Topbar
