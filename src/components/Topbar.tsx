type TopbarProps = {
  onSignIn: () => void
  onSignUp: () => void
  onSignOut?: () => void
  userName?: string
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Charts', href: '/all_chart' },
  { label: 'Wiki', href: '/all_page' },
  { label: 'Events', href: '/score/event' },
  { label: 'Players', href: '/page/all/player' },
  { label: 'Talk', href: '/talk' },
]

function Topbar({ onSignIn, onSignUp, onSignOut, userName }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <a className="brand" href="/">
          Malody
        </a>
        <nav>
          {navLinks.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="topbar-actions">
        {userName ? (
          <>
            <span className="user-pill">Hi, {userName}</span>
            <button className="btn ghost small" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button className="link btn-ghost" type="button" onClick={onSignIn}>
              Sign in
            </button>
            <button className="btn primary small" type="button" onClick={onSignUp}>
              Sign up
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Topbar
