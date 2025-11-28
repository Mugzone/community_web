import { useEffect, useState } from 'react'
import './App.css'
import { fetchBasicInfo, fetchStoreList, fetchStorePromote } from './api'
import type { RespBasicInfoNews, RespStoreListItem } from './api'

type BannerItem = {
  title: string
  description: string
  link: string
  image: string
}

type StatItem = {
  label: string
  value: string
  desc: string
}

type MapItem = {
  title: string
  artist: string
  mode: string
  cover: string
  link: string
  highlight?: string
  tags?: string[]
}

type NewsItem = {
  title: string
  link: string
  tag?: string
  desc?: string
  time?: number
}

const bannerItems: BannerItem[] = [
  {
    title: 'Malody V — Play across every platform',
    description: 'Charts, community, events and rankings in one place.',
    link: 'https://www.mugzone.net/',
    image:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Create, share, and curate charts',
    description: 'Upload your best work, get feedback, and feature on weekly show.',
    link: '/page/2147',
    image:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  },
]

const stats: StatItem[] = [
  { label: 'Pages', value: '12,480+', desc: 'Wiki, songs, charts, guides' },
  { label: 'Songs', value: '9,300+', desc: 'Multi-mode song entries' },
  { label: 'Players', value: '210k+', desc: 'Across PC, mobile and web' },
]

const newsFallback: NewsItem[] = [
  { title: 'Weekly update: editor improvements & new chart states', link: '/page/3001', tag: 'Update' },
  { title: 'Community event: Summer rank sprint begins', link: '/event/42', tag: 'Event' },
  { title: 'Help: How to submit your first chart', link: '/wiki/2147', tag: 'Guide' },
]

const newArrivalsFallback: MapItem[] = [
  {
    title: 'Starfall Chronicle',
    artist: 'Eve of Dawn',
    mode: 'Key 7',
    cover: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
    link: '/chart/1024',
    highlight: 'New',
  },
  {
    title: 'Pastel Drive',
    artist: 'KIRA',
    mode: 'Catch',
    cover: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80',
    link: '/chart/2048',
  },
  {
    title: 'Aurora Bloom',
    artist: 'Sakuzyo',
    mode: 'Step',
    cover: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80',
    link: '/chart/4096',
  },
  {
    title: 'Neon Skyline',
    artist: 'M2U',
    mode: 'Pad',
    cover: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=600&q=80',
    link: '/chart/8192',
  },
  {
    title: 'Night Flight',
    artist: 'Sakuzyo',
    mode: 'Key 6',
    cover: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
    link: '/chart/9123',
  },
  {
    title: 'Vivid Bloom',
    artist: 'Mameyudoufu',
    mode: 'Pad',
    cover: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=600&q=80',
    link: '/chart/10442',
  },
  {
    title: 'Coral Reef',
    artist: 'VINXIS',
    mode: 'Catch',
    cover: 'https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=600&q=80',
    link: '/chart/11990',
  },
  {
    title: 'Solaris',
    artist: 'Feryquitous',
    mode: 'Key 4',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    link: '/chart/12111',
  },
  {
    title: 'Cobalt Run',
    artist: 'Technoplanet',
    mode: 'Step',
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    link: '/chart/13331',
  },
  {
    title: 'Velvet Pulse',
    artist: 'DJ Noriken',
    mode: 'Pad',
    cover: 'https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=600&q=80',
    link: '/chart/14001',
  },
  {
    title: 'Cloud Harbor',
    artist: 'Moe Shop',
    mode: 'Taiko',
    cover: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80',
    link: '/chart/15252',
  },
  {
    title: 'Moonlit Stage',
    artist: 'Nhato',
    mode: 'Key 5',
    cover: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=600&q=80',
    link: '/chart/16666',
  },
  {
    title: 'Crystal Drive',
    artist: 'Sakuzyo',
    mode: 'Pad',
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    link: '/chart/17777',
  },
]

const weeklyShowFallback: MapItem[] = [
  {
    title: 'Re:Moonlight',
    artist: 'ARForest',
    mode: 'Key 4',
    cover: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
    link: '/chart/1555',
    highlight: 'Weekly Pick',
  },
  {
    title: 'Skyline Drift',
    artist: 'Hyper Potions',
    mode: 'Taiko',
    cover: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80',
    link: '/chart/2333',
  },
  {
    title: 'Beyond Reality',
    artist: 'Laur',
    mode: 'Catch',
    cover: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=600&q=80',
    link: '/chart/3777',
  },
  {
    title: 'Parallel Nights',
    artist: 'Nhato',
    mode: 'Pad',
    cover: 'https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=600&q=80',
    link: '/chart/4888',
  },
  {
    title: 'Eclipse Bloom',
    artist: 'kamome sano',
    mode: 'Key 7',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    link: '/chart/5123',
  },
  {
    title: 'Pastorale',
    artist: 'Mili',
    mode: 'Step',
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    link: '/chart/6233',
  },
  {
    title: 'Radiant Line',
    artist: 'Tomoya Ohtani',
    mode: 'Catch',
    cover: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80',
    link: '/chart/7333',
  },
  {
    title: 'Chrono Dive',
    artist: 'Sakuzyo',
    mode: 'Key 4',
    cover: 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=600&q=80',
    link: '/chart/8455',
  },
]

const externalLinks = [
  { label: 'Discord', href: 'https://discord.gg/unk9hgF' },
  { label: 'Facebook', href: 'https://www.facebook.com/MalodyHome' },
  { label: 'Sina', href: 'http://weibo.com/u/5351167572' },
]

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

function MapCard({ item }: { item: MapItem }) {
  return (
    <a className="map-card" href={item.link}>
      <div className="map-cover" style={{ backgroundImage: `url(${item.cover})` }}>
        {item.highlight && <span className="pill">{item.highlight}</span>}
      </div>
      <div className="map-meta">
        <p className="map-title">{item.title}</p>
        <p className="map-artist">{item.artist}</p>
        <p className="map-mode">{item.mode}</p>
      </div>
    </a>
  )
}

function Banner() {
  return (
    <div className="banner">
      {bannerItems.map((item) => (
        <a className="banner-card" href={item.link} key={item.title}>
          <div className="banner-overlay" />
          <img className="banner-img" src={item.image} alt={item.title} />
          <div className="banner-text">
            <p className="eyebrow">Featured</p>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </a>
      ))}
    </div>
  )
}

function StatGrid() {
  return (
    <div className="stat-grid">
      {stats.map((item) => (
        <div className="stat-card" key={item.label}>
          <p className="stat-value">{item.value}</p>
          <p className="stat-label">{item.label}</p>
          <p className="stat-desc">{item.desc}</p>
        </div>
      ))}
    </div>
  )
}

function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <div className="news">
      <h3>News & Help</h3>
      <ul>
        {items.map((item) => (
          <li key={item.title}>
            {item.tag && <span className="pill ghost">{item.tag}</span>}
            <a href={item.link}>{item.title}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <span>External links</span>
        {externalLinks.map((item) => (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
            {item.label}
          </a>
        ))}
      </div>
      <p className="footer-copy">Copyright © 2013 ~ 2025 Mugzone</p>
    </footer>
  )
}

function App() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(newsFallback)
  const [arrivalItems, setArrivalItems] = useState<MapItem[]>(newArrivalsFallback)
  const [weeklyItems, setWeeklyItems] = useState<MapItem[]>(weeklyShowFallback)

  const coverUrl = (cover?: string) => {
    if (!cover || cover.length === 0) return '//cni.mugzone.net/static/img/empty.jpg'
    return cover.startsWith('http') ? cover : `//cni.mugzone.net/${cover}`
  }

  const modeLabel = (mode?: number) => {
    if (mode === undefined || mode === null) return 'Mode'
    const map: Record<number, string> = {
      0: 'Key',
      1: 'Step',
      2: 'Taiko',
      3: 'Catch',
      4: 'Pad',
      5: 'Live',
    }
    return map[mode] ?? `Mode ${mode}`
  }

  const mapStoreToCard = (item: RespStoreListItem): MapItem => ({
    title: item.title,
    artist: item.artist,
    mode: modeLabel(item.mode),
    cover: coverUrl(item.cover),
    link: `/song/${item.sid}`,
    tags: item.tags,
  })

  useEffect(() => {
    fetchBasicInfo()
      .then((res) => {
        if (res.code !== 0 || !res.news) return
        const mapped = res.news.map((item: RespBasicInfoNews) => ({
          title: item.title ?? 'Untitled',
          link: item.link ?? '#',
          tag: 'News',
          desc: item.desc,
          time: item.time,
        }))
        if (mapped.length) setNewsItems(mapped)
      })
      .catch(() => {
        // keep fallback
      })

    fetchStoreList({ from: 0, free: 0 })
      .then((res) => {
        if (res.code !== 0 || !res.data) return
        const mapped = res.data.slice(0, 12).map(mapStoreToCard)
        if (mapped.length) setArrivalItems(mapped)
      })
      .catch(() => {
        // keep fallback
      })

    fetchStorePromote({ from: 0, free: 0 })
      .then((res) => {
        if (res.code !== 0 || !res.data) return
        const mapped = res.data.slice(0, 8).map(mapStoreToCard)
        if (mapped.length) setWeeklyItems(mapped)
      })
      .catch(() => {
        // keep fallback
      })
  }, [])

  return (
    <div className="page">
      <Topbar />
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Malody Web</p>
          <h1>Charts, rankings, community. Modernized.</h1>
          <p className="hero-desc">
            A refreshed web experience for Malody with faster pages, cleaner layout, and room for new API-driven
            features. Browse charts, keep track of players, and join discussions from any device.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="https://store.steampowered.com/app/1512940/Malody_V/">
              Get Malody V
            </a>
            <a className="btn ghost" href="/wiki/2147">
              Learn more
            </a>
          </div>
        </div>
        <div className="hero-card">
          <p className="eyebrow">Community</p>
          <h3>Weekly show & new arrivals</h3>
          <p>Featuring curated charts every week. Submit yours and climb the rankings.</p>
          <div className="hero-chips">
            <span className="chip">Multi-mode</span>
            <span className="chip">Cross-platform</span>
            <span className="chip">Creator friendly</span>
          </div>
        </div>
      </header>

      <Banner />
      <StatGrid />

      <section className="section">
        <div className="section-header">
          <h2>News &amp; Help</h2>
        </div>
        <NewsList items={newsItems} />
      </section>

      <section className="section">
        <div className="section-header">
          <h2>New Arrival</h2>
          <a className="link" href="/all_chart?type=2">
            More →
          </a>
        </div>
        <div className="map-grid">
          {arrivalItems.map((item) => (
            <MapCard item={item} key={item.title} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Weekly Show</h2>
          <a className="link" href="/all_chart?type=3">
            More →
          </a>
        </div>
        <div className="map-grid">
          {weeklyItems.map((item) => (
            <MapCard item={item} key={item.title} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default App
