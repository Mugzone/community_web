const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Charts', href: '/all_chart' },
  { label: 'Wiki', href: '/all_page' },
  { label: 'Events', href: '/score/event' },
  { label: 'Players', href: '/all_player' },
  { label: 'Talk', href: '/talk' },
]

function Topbar() {
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
        <a className="link" href="/login">
          Sign in
        </a>
        <a className="btn primary small" href="/register">
          Sign up
        </a>
      </div>
    </div>
  )
}

export default Topbar
