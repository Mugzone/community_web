import { useEffect, useMemo, useState, type FormEvent } from "react";
import ChartCard from "../components/ChartCard";
import LoadMoreButton from "../components/LoadMoreButton";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { fetchSkinList } from "../network/api";
import type { RespSkinListItem } from "../network/api";
import { coverUrl, modeLabelsFromMask } from "../utils/formatters";
import { useI18n } from "../i18n";
import "../styles/chart-list.css";
import "../styles/skin-list.css";

type FilterState = {
  mode: number;
  keyword: string;
};

type SkinCardItem = RespSkinListItem & {
  cover: string;
  modeLabels: string[];
  isBought?: boolean;
  sales?: number;
};

const parseInitialFilters = (): FilterState => {
  const search = new URLSearchParams(window.location.search);
  const modeRaw = search.get("mode");
  const modeParam = modeRaw === null ? Number.NaN : Number(modeRaw);
  return {
    mode: Number.isFinite(modeParam) ? modeParam : -1,
    keyword: search.get("word") ?? "",
  };
};

function SkinListPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const initialFilters = useMemo(() => parseInitialFilters(), []);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [skins, setSkins] = useState<SkinCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [next, setNext] = useState<number | undefined>();

  const modeOptions = useMemo(
    () => [
      { value: -1, label: t("skins.mode.all") },
      { value: 0, label: t("mode.key") },
      { value: 3, label: t("mode.catch") },
      { value: 4, label: t("mode.pad") },
      { value: 5, label: t("mode.taiko") },
      { value: 6, label: t("mode.ring") },
      { value: 7, label: t("mode.slide") },
      { value: 8, label: t("mode.live") },
      { value: 9, label: t("mode.cube") },
    ],
    [t]
  );

  const buildParams = (current: FilterState, from: number) => {
    const params: { mode?: number; word?: string; from?: number } = {
      mode: current.mode,
      from,
    };
    if (current.keyword.trim()) params.word = current.keyword.trim();
    return params;
  };

  const mapToCard = (items: RespSkinListItem[]) =>
    items.map((item) => ({
      ...item,
      cover: coverUrl(item.cover),
      modeLabels: modeLabelsFromMask(item.mode),
      isBought: item.buy,
      sales: item.hot,
    }));

  const formatPrice = (price?: number) => {
    if (!price) return t("skins.price.free");
    return t("skins.price.value", { value: price });
  };

  const formatSales = (sales?: number) => {
    if (sales === undefined || sales === null) return "";
    return t("skins.sales", { value: sales });
  };

  const formatUpdated = (value?: number) => {
    if (!value) return t("charts.card.updatedUnknown");
    const date = new Date(value * 1000);
    if (Number.isNaN(date.getTime())) return t("charts.card.updatedUnknown");
    return t("charts.card.updated", { time: date.toLocaleDateString() });
  };

  const loadSkins = async (reset = false, activeFilters?: FilterState) => {
    if (loading) return;
    const currentFilters = activeFilters ?? filters;
    setLoading(true);
    setError("");
    try {
      const from = reset ? 0 : next ?? 0;
      const resp = await fetchSkinList(buildParams(currentFilters, from));
      if (resp.code !== 0 || !resp.data) {
        setError(t("skins.error.fetch"));
        if (reset) setSkins([]);
        setHasMore(false);
        setNext(undefined);
        return;
      }
      const mapped = mapToCard(resp.data);
      setSkins((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHasMore(Boolean(resp.hasMore));
      setNext(resp.next);
    } catch (err) {
      console.error(err);
      setError(t("skins.error.network"));
      if (reset) setSkins([]);
      setHasMore(false);
      setNext(undefined);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitFilters = (e: FormEvent) => {
    e.preventDefault();
    loadSkins(true);
  };

  const resetFilters = () => {
    const reset = { ...initialFilters };
    setFilters(reset);
    loadSkins(true, reset);
  };

  useEffect(() => {
    loadSkins(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <section className="skin-hero">
        <div>
          <p className="eyebrow">{t("skins.eyebrow")}</p>
          <h1>{t("skins.title")}</h1>
          <p>{t("skins.desc")}</p>
        </div>
        <div className="skin-hero-card">
          <p className="eyebrow">{t("skins.filter.title")}</p>
          <form className="chart-filters" onSubmit={onSubmitFilters}>
            <label className="chart-field">
              <span>{t("skins.filter.keyword")}</span>
              <input
                type="search"
                value={filters.keyword}
                placeholder={t("skins.filter.keywordPlaceholder")}
                onChange={(e) =>
                  setFilters({ ...filters, keyword: e.target.value })
                }
              />
            </label>
            <label className="chart-field">
              <span>{t("skins.filter.mode")}</span>
              <select
                value={filters.mode}
                onChange={(e) =>
                  setFilters({ ...filters, mode: Number(e.target.value) })
                }
              >
                {modeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="chart-actions-row">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? t("skins.loading") : t("skins.filter.apply")}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={resetFilters}
                disabled={loading}
              >
                {t("skins.filter.reset")}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("skins.listTitle")}</h2>
          <span className="chart-count">
            {error ? error : t("skins.results.count", { count: skins.length })}
          </span>
        </div>
        {skins.length ? (
          <div className="skin-grid">
            {skins.map((item) => (
              <ChartCard
                key={item.id}
                className="skin-card"
                href={`/store/skin/detail/${item.id}`}
                cover={item.cover}
                title={item.name}
                artist={
                  item.creator
                    ? t("skins.creator", { name: item.creator })
                    : t("skins.creator.unknown")
                }
                badges={
                  <>
                    {item.modeLabels.slice(0, 3).map((label) => (
                      <span className="pill chart-mode-pill" key={label}>
                        {label}
                      </span>
                    ))}
                    {item.isBought && (
                      <span className="pill ghost">
                        {t("skins.badge.owned")}
                      </span>
                    )}
                  </>
                }
                meta={
                  <>
                    <span className="meta-pill">{formatPrice(item.price)}</span>
                    {item.sales !== undefined && item.sales !== null && (
                      <span className="meta-pill">
                        {formatSales(item.sales)}
                      </span>
                    )}
                  </>
                }
                footer={
                  <span className="chart-card-updated">
                    {formatUpdated(item.time)}
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <div className="chart-empty">
            {error
              ? error
              : loading
              ? t("skins.loading")
              : t("skins.results.empty")}
          </div>
        )}
        <div className="chart-actions">
          {hasMore && (
            <LoadMoreButton
              label={t("skins.loadMore")}
              loadingLabel={t("skins.loading")}
              loading={loading}
              onClick={() => loadSkins()}
            />
          )}
        </div>
      </section>

      {auth.modal}
    </PageLayout>
  );
}

export default SkinListPage;
