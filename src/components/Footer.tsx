type FooterLink = {
  label: string
  href: string
}

type FooterProps = {
  links: FooterLink[]
}

function Footer({ links }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-links">
        <span>External links</span>
        {links.map((item) => (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
            {item.label}
          </a>
        ))}
      </div>
      <p className="footer-copy">Copyright © 2013 ~ 2025 Mugzone</p>
    </footer>
  )
}

export default Footer
