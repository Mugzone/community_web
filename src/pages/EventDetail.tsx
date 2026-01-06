import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import RankingBars from "../components/RankingBars";
import {
  fetchEventCharts,
  fetchEventRanking,
  fetchStoreEvents,
  getSession,
  type RespEventChartItem,
  type RespRankingEventItem,
  type RespStoreEventItem,
} from "../network/api";
import { chartTypeBadge, coverUrl, modeLabel } from "../utils/formatters";
import { buildEventStatus, parseEventDate } from "../utils/events";
import { isOrgMember } from "../utils/auth";
import { useI18n } from "../i18n";
import "../styles/event-detail.css";

const parseEventId = () => {
  const search = new URLSearchParams(window.location.search);
  const raw = search.get("eid") ?? search.get("id");
  return raw ? Number(raw) : undefined;
};

function EventDetailPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const eventId = useMemo(() => parseEventId(), []);

  const [info, setInfo] = useState<RespStoreEventItem | undefined>();
  const [charts, setCharts] = useState<RespEventChartItem[]>([]);
  const [ranking, setRanking] = useState<RespRankingEventItem[]>([]);

  const [infoLoading, setInfoLoading] = useState(false);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);

  const [infoError, setInfoError] = useState("");
  const [chartsError, setChartsError] = useState("");
  const [rankingError, setRankingError] = useState("");
  const canManage = isOrgMember(getSession()?.groups ?? []);

  const statusLabel = useMemo(
    () => ({
      upcoming: t("events.status.upcoming"),
      ongoing: t("events.status.ongoing"),
      ended: t("events.status.ended"),
      unknown: t("events.status.unknown"),
    }),
    [t]
  );

  const formatDate = (value?: string | number) => {
    const parsed = parseEventDate(value);
    if (!parsed) return t("events.time.unknown");
    return parsed.toLocaleDateString();
  };

  useEffect(() => {
    if (!eventId || Number.isNaN(eventId)) {
      const message = t("events.detail.error.missing");
      setInfoError(message);
      setChartsError(message);
      setRankingError(message);
      return;
    }
    let cancelled = false;

    const loadInfo = async () => {
      setInfoLoading(true);
      setInfoError("");
      try {
        let from = 0;
        let found: RespStoreEventItem | undefined;
        let hasMore = true;
        let attempts = 0;
        let failed = false;
        while (!found && hasMore && attempts < 10) {
          const resp = await fetchStoreEvents({ active: 0, from });
          if (cancelled) return;
          if (resp.code !== 0 || !resp.data) {
            setInfoError(t("events.detail.error.load"));
            failed = true;
            break;
          }
          found = resp.data.find((item) => item.eid === eventId);
          if (found) break;
          hasMore = Boolean(resp.hasMore);
          if (resp.next === undefined) break;
          from = resp.next;
          attempts += 1;
        }
        if (!found && !failed) {
          setInfoError(t("events.detail.error.notFound"));
        }
        setInfo(found);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setInfoError(t("events.detail.error.load"));
          setInfo(undefined);
        }
      } finally {
        if (!cancelled) setInfoLoading(false);
      }
    };

    const loadCharts = async () => {
      setChartsLoading(true);
      setChartsError("");
      try {
        const resp = await fetchEventCharts({ eid: eventId });
        if (cancelled) return;
        if (resp.code !== 0 || !resp.data) {
          setChartsError(t("events.detail.charts.error"));
          setCharts([]);
          return;
        }
        setCharts(resp.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setChartsError(t("events.detail.charts.error"));
          setCharts([]);
        }
      } finally {
        if (!cancelled) setChartsLoading(false);
      }
    };

    loadInfo();
    loadCharts();

    return () => {
      cancelled = true;
    };
  }, [eventId, t]);

  const rankingEventId = useMemo(() => {
    if (!eventId || Number.isNaN(eventId)) return undefined;
    return info?.scoreId ?? info?.scoreID ?? eventId;
  }, [eventId, info?.scoreId, info?.scoreID]);

  useEffect(() => {
    if (!rankingEventId || Number.isNaN(rankingEventId)) return;
    let cancelled = false;
    const loadRanking = async () => {
      setRankingLoading(true);
      setRankingError("");
      try {
        const resp = await fetchEventRanking({ eid: rankingEventId });
        if (cancelled) return;
        if (resp.code !== 0 || !resp.data) {
          setRankingError(t("events.detail.ranking.error"));
          setRanking([]);
          return;
        }
        setRanking(resp.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setRankingError(t("events.detail.ranking.error"));
          setRanking([]);
        }
      } finally {
        if (!cancelled) setRankingLoading(false);
      }
    };
    loadRanking();
    return () => {
      cancelled = true;
    };
  }, [rankingEventId, t]);

  const status = buildEventStatus(info?.start, info?.end);
  const rangeLabel = t("events.detail.meta.range", {
    start: formatDate(info?.start),
    end: formatDate(info?.end),
  });

  return (
    <PageLayout className="event-detail-page" topbarProps={auth.topbarProps}>
      <header className="event-detail-hero">
        <div
          className="event-detail-cover"
          style={{ backgroundImage: `url(${coverUrl(info?.cover)})` }}
        />
        <div className="event-detail-summary">
          <p className="eyebrow">{t("events.detail.eyebrow")}</p>
          <h1>{info?.name ?? t("events.name.untitled")}</h1>
          <p className="event-detail-desc">{t("events.detail.desc")}</p>
          <div className="event-detail-meta">
            <span className="pill ghost">{statusLabel[status]}</span>
            <span className="pill ghost">{rangeLabel}</span>
            {eventId && !Number.isNaN(eventId) && (
              <span className="pill ghost">
                {t("events.detail.meta.id", { id: eventId })}
              </span>
            )}
          </div>
          <div className="event-detail-actions">
            {canManage && eventId && !Number.isNaN(eventId) && (
              <a className="btn ghost small" href={`/score/event/edit?eid=${eventId}`}>
                {t("events.edit.open")}
              </a>
            )}
          </div>
          {infoLoading && !info && (
            <p className="event-detail-loading">{t("charts.loading")}</p>
          )}
          {infoError && <p className="eve nt-detail-error">{infoError}</p>}
        </div>
      </header>

      <main className="content-container">
        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("events.detail.charts.eyebrow")}</p>
              <h2>{t("events.detail.charts.title")}</h2>
            </div>
          </div>
          {chartsError ? (
            <div className="chart-empty">{chartsError}</div>
          ) : chartsLoading && !charts.length ? (
            <div className="chart-empty">{t("charts.loading")}</div>
          ) : charts.length ? (
            <div className="event-chart-grid">
              {charts.map((chart) => {
                const typeBadge = chartTypeBadge(chart.type);
                return (
                  <a
                    className="event-chart-card"
                    href={`/chart/${chart.cid}`}
                    key={chart.cid}
                  >
                    <div
                      className="event-chart-cover"
                      style={{
                        backgroundImage: `url(${coverUrl(chart.cover)})`,
                      }}
                    />
                    <div className="event-chart-body">
                      <p className="event-chart-title">
                        {chart.title ?? t("events.detail.charts.untitled")}
                      </p>
                      <p className="event-chart-artist">
                        {chart.artist ?? t("events.detail.charts.artistUnknown")}
                      </p>
                      <div className="event-chart-tags">
                        {chart.mode !== undefined && (
                          <span className="pill ghost">
                            {modeLabel(chart.mode)}
                          </span>
                        )}
                        {chart.version && (
                          <span className="pill ghost">{chart.version}</span>
                        )}
                        {chart.level !== undefined && (
                          <span className="pill ghost">
                            {t("events.detail.charts.level", {
                              value: chart.level,
                            })}
                          </span>
                        )}
                        {typeBadge && (
                          <span className={typeBadge.className}>
                            {typeBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="chart-empty">{t("events.detail.charts.empty")}</div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("events.detail.ranking.eyebrow")}</p>
              <h2>{t("events.detail.ranking.title")}</h2>
            </div>
          </div>
          {rankingError ? (
            <div className="chart-empty">{rankingError}</div>
          ) : rankingLoading && !ranking.length ? (
            <div className="chart-empty">{t("charts.loading")}</div>
          ) : ranking.length ? (
            <RankingBars
              columns={{
                rank: t("events.detail.ranking.table.rank"),
                player: t("events.detail.ranking.table.player"),
                value: t("events.detail.ranking.table.score"),
              }}
              items={ranking.map((row, index) => ({
                uid: row.uid,
                name: row.username ?? `#${row.uid}`,
                value: row.score ?? 0,
                rank: row.index ?? index + 1,
              }))}
            />
          ) : (
            <div className="chart-empty">{t("events.detail.ranking.empty")}</div>
          )}
        </section>
      </main>

      {auth.modal}
    </PageLayout>
  );
}

export default EventDetailPage;
