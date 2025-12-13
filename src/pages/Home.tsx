import { useEffect, useMemo, useState } from 'react'
// import Banner from '../components/Banner'
import MapCard from '../components/MapCard'
import NewsList from '../components/NewsList'
import StatGrid from '../components/StatGrid'
import PageLayout from '../components/PageLayout'
import { useAuthModal } from '../components/useAuthModal'
import { fetchBasicInfo, fetchStoreList } from '../network/api'
import type { RespBasicInfoNews, RespStoreListItem } from '../network/api'
import type {  MapItem, NewsItem, StatItem } from '../types/content'
import { useI18n } from '../i18n'
import { coverUrl, modeLabel, modeLabelsFromMask } from '../utils/formatters'
import './home.css'

// const bannerItems: BannerItem[] = [
//   {
//     title: 'Malody V — Play across every platform',
//     description: 'Charts, community, events and rankings in one place.',
//     link: 'https://www.mugzone.net/',
//     image:
//       'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
//   },
//   {
//     title: 'Create, share, and curate charts',
//     description: 'Upload your best work, get feedback, and feature on weekly show.',
//     link: '/page/2147',
//     image:
//       'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
//   },
// ]

const statMeta = [
  { value: '12,480+', labelKey: 'home.stats.pages.label', descKey: 'home.stats.pages.desc' },
  { value: '9,300+', labelKey: 'home.stats.songs.label', descKey: 'home.stats.songs.desc' },
  { value: '210k+', labelKey: 'home.stats.players.label', descKey: 'home.stats.players.desc' },
]

const mapStoreToCard = (item: RespStoreListItem): MapItem => ({
  title: item.title,
  artist: item.artist,
  mode: (() => {
    const labels = modeLabelsFromMask(item.mode)
    const limited = labels.slice(0, 4)
    return labels.length > limited.length ? `${limited.join(' / ')} ...` : limited.join(' / ') || modeLabel(item.mode)
  })(),
  cover: coverUrl(item.cover),
  link: `/song/${item.sid}`,
  tags: item.tags,
})

function HomePage() {
  const { t } = useI18n()
  const auth = useAuthModal()
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [arrivalItems, setArrivalItems] = useState<MapItem[]>([])
  // const [setWeeklyItems] = useState<MapItem[]>([])
  const wikiEntry = useMemo(
    () => ({
      title: t('wiki.testEntry.title'),
      link: '/wiki/2147',
      tag: 'Wiki',
      desc: t('wiki.testEntry.desc'),
    }),
    [t],
  )
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
    const withWikiEntry = (items: NewsItem[]) => {
      const exists = items.some((item) => item.link === wikiEntry.link)
      return exists ? items : [wikiEntry, ...items]
    }

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
        if (mapped.length) setNewsItems(withWikiEntry(mapped))
        else setNewsItems(withWikiEntry([]))
      })
      .catch(() => {
        setNewsItems(withWikiEntry([]))
      })

    fetchStoreList({ from: 0, free: 0 })
      .then((res) => {
        if (res.code !== 0 || !res.data) return
        const mapped = res.data.slice(0, 12).map(mapStoreToCard)
        if (mapped.length) setArrivalItems(mapped)
      })
      .catch(() => {
        setArrivalItems([])
      })

    // fetchStorePromote({ from: 0, free: 0 })
    //   .then((res) => {
    //     if (res.code !== 0 || !res.data) return
    //     const mapped = res.data.slice(0, 8).map(mapStoreToCard)
    //     if (mapped.length) setWeeklyItems(mapped)
    //   })
    //   .catch(() => {
    //     setWeeklyItems([])
    //   })
  }, [wikiEntry])

  return (
    <PageLayout topbarProps={auth.topbarProps}>
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

      {/*<Banner items={bannerItems} />*/}
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
        {arrivalItems.length ? (
          <div className="map-grid">
            {arrivalItems.map((item) => (
              <MapCard item={item} key={item.title} />
            ))}
          </div>
        ) : (
          <div className="home-empty-card">{t('home.empty.arrival')}</div>
        )}
      </section>

      {/*<section className="section">*/}
      {/*  <div className="section-header">*/}
      {/*    <h2>{t('home.section.weeklyShow')}</h2>*/}
      {/*    <a className="link" href="/all_chart?type=3">*/}
      {/*      {t('home.section.more')}*/}
      {/*    </a>*/}
      {/*  </div>*/}
      {/*  {weeklyItems.length ? (*/}
      {/*    <div className="map-grid">*/}
      {/*      {weeklyItems.map((item) => (*/}
      {/*        <MapCard item={item} key={item.title} />*/}
      {/*      ))}*/}
      {/*    </div>*/}
      {/*  ) : (*/}
      {/*    <div className="home-empty-card">{t('home.empty.weekly')}</div>*/}
      {/*  )}*/}
      {/*</section>*/}

      {auth.modal}
    </PageLayout>
  )
}

export default HomePage
