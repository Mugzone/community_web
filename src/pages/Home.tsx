import { useEffect, useMemo, useState } from "react";
// import Banner from '../components/Banner'
import MapCard from "../components/MapCard";
import NewsList from "../components/NewsList";
import StatGrid from "../components/StatGrid";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { fetchBasicInfo, fetchStoreList } from "../network/api";
import type { RespBasicInfoNews, RespStoreListItem } from "../network/api";
import type { MapItem, NewsItem, StatItem } from "../types/content";
import { useI18n } from "../i18n";
import { coverUrl, modeLabel, modeLabelsFromMask } from "../utils/formatters";
import "../styles/home.css";

const statMeta = [
  {
    value: "12,480+",
    labelKey: "home.stats.pages.label",
    descKey: "home.stats.pages.desc",
  },
  {
    value: "9,300+",
    labelKey: "home.stats.songs.label",
    descKey: "home.stats.songs.desc",
  },
  {
    value: "210k+",
    labelKey: "home.stats.players.label",
    descKey: "home.stats.players.desc",
  },
];

const mapStoreToCard = (item: RespStoreListItem): MapItem => ({
  title: item.title,
  artist: item.artist,
  mode: (() => {
    const labels = modeLabelsFromMask(item.mode);
    const limited = labels.slice(0, 4);
    return labels.length > limited.length
      ? `${limited.join(" / ")} ...`
      : limited.join(" / ") || modeLabel(item.mode);
  })(),
  cover: coverUrl(item.cover),
  link: `/song/${item.sid}`,
  tags: item.tags,
});

function HomePage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsCovers, setNewsCovers] = useState<
    { src: string; title: string; link?: string }[]
  >([]);
  const [activeCover, setActiveCover] = useState(0);
  const [arrivalItems, setArrivalItems] = useState<MapItem[]>([]);
  const wikiEntry = useMemo(
    () => ({
      title: t("wiki.testEntry.title"),
      link: "/wiki/2147",
      tag: "Wiki",
      desc: t("wiki.testEntry.desc"),
    }),
    [t]
  );
  const stats: StatItem[] = useMemo(
    () =>
      statMeta.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
        desc: t(item.descKey),
      })),
    [t]
  );

  useEffect(() => {
    const withWikiEntry = (items: NewsItem[]) => {
      const exists = items.some((item) => item.link === wikiEntry.link);
      return exists ? items : [wikiEntry, ...items];
    };

    fetchBasicInfo()
      .then((res) => {
        if (res.code !== 0 || !res.news) {
          setNewsItems(withWikiEntry([]));
          setNewsCovers([]);
          return;
        }
        const mapped = res.news.map((item: RespBasicInfoNews) => ({
          title: item.title ?? "Untitled",
          link: item.link ?? "#",
          tag: "News",
          desc: item.desc,
          time: item.time,
        }));
        setNewsItems(withWikiEntry(mapped));
        const coverItems = res.news.flatMap((item) => {
          const desc = item.desc?.trim();
          if (!desc || !desc.startsWith("http")) return [];
          return [
            {
              src: desc,
              title: item.title ?? "News",
              link: item.link,
            },
          ];
        });
        setNewsCovers(coverItems);
      })
      .catch(() => {
        setNewsItems(withWikiEntry([]));
        setNewsCovers([]);
      });

    fetchStoreList({ from: 0, free: 0 })
      .then((res) => {
        if (res.code !== 0 || !res.data) return;
        const mapped = res.data.slice(0, 12).map(mapStoreToCard);
        if (mapped.length) setArrivalItems(mapped);
      })
      .catch(() => {
        setArrivalItems([]);
      });
  }, [wikiEntry]);

  useEffect(() => {
    if (newsCovers.length) setActiveCover(0);
  }, [newsCovers.length]);

  useEffect(() => {
    if (newsCovers.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveCover((prev) => (prev + 1) % newsCovers.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [newsCovers.length]);

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <header className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <p className="eyebrow">Malody Web Community</p>
            <h1>
              {t("home.hero.title")} <br />
              <span className="highlight">{t("home.hero.subtitle")}</span>
            </h1>
            <p className="hero-desc">{t("home.hero.desc")}</p>
            <div className="hero-actions">
              <a
                className="btn primary"
                href="https://store.steampowered.com/app/1512940/Malody_V/"
              >
                <span
                  className="material-icons"
                  style={{ fontSize: "1.25rem", marginRight: "0.5rem" }}
                >
                  download
                </span>
                {t("home.hero.cta.primary")}
              </a>
              <a className="btn ghost" href="/wiki/2147">
                {t("home.hero.cta.secondary")}
              </a>
            </div>
          </div>
        </div>
      </header>

      <StatGrid items={stats} />

      {newsCovers.length ? (
        <div className="news-carousel">
          <div className="news-carousel-frame">
            <div
              className="news-carousel-track"
              style={{ transform: `translateX(-${activeCover * 100}%)` }}
            >
              {newsCovers.map((item, index) => {
                const image = (
                  <img
                    src={item.src}
                    alt={item.title}
                    className="news-carousel-image"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                );
                return item.link ? (
                  <a
                    className="news-carousel-slide"
                    href={item.link}
                    key={`${item.src}-${index}`}
                  >
                    {image}
                  </a>
                ) : (
                  <div
                    className="news-carousel-slide"
                    key={`${item.src}-${index}`}
                  >
                    {image}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="news-carousel-dots">
            {newsCovers.map((item, index) => (
              <button
                key={`${item.src}-dot-${index}`}
                type="button"
                className={`news-carousel-dot${
                  index === activeCover ? " active" : ""
                }`}
                onClick={() => setActiveCover(index)}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      <section className="section">
        <div className="news-arrival-grid">
          <div className="news-column">
            <div className="section-header">
              <h2>{t("home.section.news")}</h2>
            </div>
            <NewsList items={newsItems} />
          </div>
          <div className="arrival-column">
            <div className="section-header">
              <h2>{t("home.section.newArrival")}</h2>
              <a className="link" href="/all_chart?type=2">
                {t("home.section.more")}
              </a>
            </div>
            {arrivalItems.length ? (
              <div className="map-grid-compact">
                {arrivalItems.slice(0, 6).map((item) => (
                  <MapCard item={item} key={item.title} />
                ))}
              </div>
            ) : (
              <div className="home-empty-card">{t("home.empty.arrival")}</div>
            )}
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="features-header">
            <h2>{t("home.features.title")}</h2>
            <p>{t("home.features.desc")}</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon green">
                <span className="material-icons">settings</span>
              </div>
              <h3>{t("home.features.customizable.title")}</h3>
              <p>{t("home.features.customizable.desc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon red">
                <span className="material-icons">speed</span>
              </div>
              <h3>{t("home.features.training.title")}</h3>
              <p>{t("home.features.training.desc")}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon purple">
                <span className="material-icons">edit</span>
              </div>
              <h3>{t("home.features.editor.title")}</h3>
              <p>{t("home.features.editor.desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {auth.modal}
    </PageLayout>
  );
}

export default HomePage;
