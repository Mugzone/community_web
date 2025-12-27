import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { fetchStoreEvents, getSession } from "../network/api";
import type { RespStoreEventItem } from "../network/api";
import { coverUrl } from "../utils/formatters";
import { buildEventStatus, parseEventDate, type EventStatus } from "../utils/events";
import { isOrgMember } from "../utils/auth";
import { useI18n } from "../i18n";
import "../styles/event-list.css";

type EventCardItem = RespStoreEventItem & {
  cover: string;
  status: EventStatus;
};

function EventListPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const [events, setEvents] = useState<EventCardItem[]>([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [next, setNext] = useState<number | undefined>();
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

  const mapToCard = (items: RespStoreEventItem[]) =>
    items.map((item) => ({
      ...item,
      cover: coverUrl(item.cover),
      status: buildEventStatus(item.start, item.end),
    }));

  const formatDate = (ts?: string | number) => {
    const date = parseEventDate(ts);
    if (!date) return t("events.time.unknown");
    return date.toLocaleDateString();
  };

  const loadEvents = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const from = reset ? 0 : next ?? 0;
      const resp = await fetchStoreEvents({ active: activeOnly ? 1 : 0, from });
      if (resp.code !== 0 || !resp.data) {
        setError(t("events.error.fetch"));
        if (reset) setEvents([]);
        setHasMore(false);
        setNext(undefined);
        return;
      }
      const mapped = mapToCard(resp.data);
      setEvents((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHasMore(Boolean(resp.hasMore));
      setNext(resp.next);
    } catch (err) {
      console.error(err);
      setError(t("events.error.network"));
      if (reset) setEvents([]);
      setHasMore(false);
      setNext(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <section className="event-hero">
        <div>
          <p className="eyebrow">{t("events.eyebrow")}</p>
          <h1>{t("events.title")}</h1>
          <p>{t("events.desc")}</p>
          <div className="event-filters">
            <label className="chart-checkbox">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              <span>{t("events.filter.activeOnly")}</span>
            </label>
            {canManage && (
              <a className="btn primary" href="/score/event/edit">
                {t("events.create")}
              </a>
            )}
          </div>
        </div>
        <div className="event-hero-card">
          <p className="eyebrow">{t("events.highlight.title")}</p>
          <p className="event-highlight">{t("events.highlight.desc")}</p>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("events.listTitle")}</h2>
          <span className="chart-count">
            {error
              ? error
              : t("events.results.count", { count: events.length })}
          </span>
        </div>

        {events.length ? (
          <div className="event-grid">
            {events.map((item) => {
              const link = item.wiki
                ? `/wiki/${item.wiki}`
                : `/score/event?eid=${item.eid}`;
              return (
                <a className="event-card" href={link} key={item.eid}>
                  <div
                    className="event-cover"
                    style={{ backgroundImage: `url(${item.cover})` }}
                  >
                    <span className={`pill event-pill ${item.status}`}>
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  <div className="event-body">
                    <div>
                      <p className="event-title">
                        {item.name ?? t("events.name.untitled")}
                      </p>
                      <p className="event-meta">
                        {formatDate(item.start)} — {formatDate(item.end)}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="chart-empty">
            {error
              ? error
              : loading
              ? t("events.loading")
              : t("events.results.empty")}
          </div>
        )}

        <div className="chart-actions">
          {hasMore && (
            <button
              className="load-more"
              type="button"
              onClick={() => loadEvents()}
              disabled={loading}
            >
              {loading ? t("events.loading") : t("events.loadMore")}
            </button>
          )}
        </div>
      </section>

      {auth.modal}
    </PageLayout>
  );
}

export default EventListPage;
