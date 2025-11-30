import { useEffect, useMemo, useState } from 'react'
import AuthModal from '../components/AuthModal'
import Banner from '../components/Banner'
import Footer from '../components/Footer'
import MapCard from '../components/MapCard'
import NewsList from '../components/NewsList'
import StatGrid from '../components/StatGrid'
import Topbar from '../components/Topbar'
import { fetchBasicInfo, fetchStoreList, fetchStorePromote, setSession } from '../network/api'
import type { RespBasicInfoNews, RespStoreListItem } from '../network/api'
import type { BannerItem, MapItem, NewsItem, StatItem } from '../types/content'
import { useI18n } from '../i18n'
import { coverUrl, modeLabel } from '../utils/formatters'
import './home.css'

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

const statMeta = [
  { value: '12,480+', labelKey: 'home.stats.pages.label', descKey: 'home.stats.pages.desc' },
  { value: '9,300+', labelKey: 'home.stats.songs.label', descKey: 'home.stats.songs.desc' },
  { value: '210k+', labelKey: 'home.stats.players.label', descKey: 'home.stats.players.desc' },
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

const mapStoreToCard = (item: RespStoreListItem): MapItem => ({
  title: item.title,
  artist: item.artist,
  mode: modeLabel(item.mode),
  cover: coverUrl(item.cover),
  link: `/song/${item.sid}`,
  tags: item.tags,
})

function HomePage() {
  const { t } = useI18n()
  const [newsItems, setNewsItems] = useState<NewsItem[]>(newsFallback)
  const [arrivalItems, setArrivalItems] = useState<MapItem[]>(newArrivalsFallback)
  const [weeklyItems, setWeeklyItems] = useState<MapItem[]>(weeklyShowFallback)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [userName, setUserName] = useState<string>()
  const stats: StatItem[] = useMemo(
    () =>
      statMeta.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
        desc: t(item.descKey),
      })),
    [t],
  )

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
      <Topbar
        onSignIn={() => {
          setAuthMode('signin')
          setAuthOpen(true)
        }}
        onSignUp={() => {
          setAuthMode('signup')
          setAuthOpen(true)
        }}
        onSignOut={() => {
          setSession(undefined)
          setUserName(undefined)
        }}
        userName={userName}
      />
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Malody Web</p>
          <h1>{t('home.hero.title')}</h1>
          <p className="hero-desc">{t('home.hero.desc')}</p>
          <div className="hero-actions">
            <a className="btn primary" href="https://store.steampowered.com/app/1512940/Malody_V/">
              {t('home.hero.cta.primary')}
            </a>
            <a className="btn ghost" href="/wiki/2147">
              {t('home.hero.cta.secondary')}
            </a>
          </div>
        </div>
        <div className="hero-card">
          <p className="eyebrow">{t('home.hero.communityEyebrow')}</p>
          <h3>{t('home.hero.cardTitle')}</h3>
          <p>{t('home.hero.cardDesc')}</p>
          <div className="hero-chips">
            <span className="chip">{t('home.hero.chip.multi')}</span>
            <span className="chip">{t('home.hero.chip.cross')}</span>
            <span className="chip">{t('home.hero.chip.creator')}</span>
          </div>
        </div>
      </header>

      <Banner items={bannerItems} />
      <StatGrid items={stats} />

      <section className="section">
        <div className="section-header">
          <h2>{t('home.section.news')}</h2>
        </div>
        <NewsList items={newsItems} />
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t('home.section.newArrival')}</h2>
          <a className="link" href="/all_chart?type=2">
            {t('home.section.more')}
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
          <h2>{t('home.section.weeklyShow')}</h2>
          <a className="link" href="/all_chart?type=3">
            {t('home.section.more')}
          </a>
        </div>
        <div className="map-grid">
          {weeklyItems.map((item) => (
            <MapCard item={item} key={item.title} />
          ))}
        </div>
      </section>

      <Footer links={externalLinks} showLanguageSelector />
      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={({ username }) => setUserName(username)}
        />
      )}
    </div>
  )
}

export default HomePage
