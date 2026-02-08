import { useEffect, useMemo, useState, type FormEvent } from "react";
import ChartCard from "../components/ChartCard";
import LoadMoreButton from "../components/LoadMoreButton";
import MultiSelect from "../components/MultiSelect";
import PageLayout from "../components/PageLayout";
import RangeSlider from "../components/RangeSlider";
import { UseAuthModal } from "../components/UseAuthModal";
import { fetchStoreListV2 } from "../network/api";
import type { RespStoreListItem } from "../network/api";
import { coverUrl, modeLabelsFromMask } from "../utils/formatters";
import { useI18n } from "../i18n";
import { getOrgParam } from "../utils/locale";
import "../styles/chart-list.css";

type FilterState = {
  mode: number;
  keyword: string;
  free: number; // -1=all, 0=normal, 1=freestyle
  types: number[]; // 0=alpha, 1=beta, 2=stable
  levelMin: string;
  levelMax: string;
  bpmMin: string;
  bpmMax: string;
  lengthMin: string;
  lengthMax: string;
  sort: string; // time, hot, level
  order: string; // asc, desc
};

type ChartCardItem = RespStoreListItem & {
  cover: string;
  modeLabels: string[];
};

const parseInitialFilters = (): FilterState => {
  const search = new URLSearchParams(window.location.search);
  const modeRaw = search.get("mode");
  const modeParam = modeRaw === null ? Number.NaN : Number(modeRaw);
  const freeParam = search.get("free");
  const typeParam = search.get("type");
  const lvmin = search.get("lvmin");
  const lvmax = search.get("lvmax");
  const bpmmin = search.get("bpmmin");
  const bpmmax = search.get("bpmmax");
  const lenmin = search.get("lenmin");
  const lenmax = search.get("lenmax");
  const sort = search.get("sort");
  const order = search.get("order");

  // 解析 type 参数
  let types: number[] = [2]; // 默认 stable
  if (typeParam) {
    types = typeParam.split(",").map(Number).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 2);
    if (types.length === 0) types = [2];
  }

  return {
    mode: Number.isFinite(modeParam) ? modeParam : -1,
    keyword: search.get("word") ?? "",
    free: freeParam === null ? -1 : Number(freeParam),
    types,
    levelMin: lvmin ?? "",
    levelMax: lvmax ?? "",
    bpmMin: bpmmin ?? "",
    bpmMax: bpmmax ?? "",
    lengthMin: lenmin ?? "",
    lengthMax: lenmax ?? "",
    sort: sort ?? "time",
    order: order ?? "desc",
  };
};

const defaultFilters: FilterState = {
  mode: -1,
  keyword: "",
  free: -1,
  types: [2],
  levelMin: "",
  levelMax: "",
  bpmMin: "",
  bpmMax: "",
  lengthMin: "",
  lengthMax: "",
  sort: "time",
  order: "desc",
};

function ChartListPage() {
  const { t, lang } = useI18n();
  const auth = UseAuthModal();
  const orgParam = getOrgParam(lang);
  const initialFilters = useMemo(() => parseInitialFilters(), []);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [charts, setCharts] = useState<ChartCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [next, setNext] = useState<number | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const modeOptions = useMemo(
    () => [
      { value: -1, label: t("charts.mode.all") },
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

  const freeOptions = useMemo(
    () => [
      { value: -1, label: t("charts.filter.freeAll") },
      { value: 0, label: t("charts.filter.freeNormal") },
      { value: 1, label: t("charts.filter.freeStyle") },
    ],
    [t]
  );

  const typeOptions = useMemo(
    () => [
      { value: 2, label: t("charts.filter.typeStable") },
      { value: 1, label: t("charts.filter.typeBeta") },
      { value: 0, label: t("charts.filter.typeAlpha") },
    ],
    [t]
  );

  const buildParams = (current: FilterState, from: number) => {
    const lvminNum = Number(current.levelMin);
    const lvmaxNum = Number(current.levelMax);
    const bpmminNum = Number(current.bpmMin);
    const bpmmaxNum = Number(current.bpmMax);
    const lenminNum = Number(current.lengthMin);
    const lenmaxNum = Number(current.lengthMax);

    const params: {
      mode?: number;
      type?: string;
      from?: number;
      free?: number;
      word?: string;
      org?: number;
      lvmin?: number;
      lvmax?: number;
      bpmmin?: number;
      bpmmax?: number;
      lenmin?: number;
      lenmax?: number;
      sort?: string;
      order?: string;
    } = {
      from,
      sort: current.sort,
      order: current.order,
      org: orgParam,
    };

    if (current.mode !== -1) {
      params.mode = current.mode;
    }
    if (current.free !== -1) {
      params.free = current.free;
    }
    if (current.types.length > 0) {
      params.type = current.types.join(",");
    }
    if (current.keyword.trim()) {
      params.word = current.keyword.trim();
    }
    if (!Number.isNaN(lvminNum) && current.levelMin !== "") {
      params.lvmin = lvminNum;
    }
    if (!Number.isNaN(lvmaxNum) && current.levelMax !== "") {
      params.lvmax = lvmaxNum;
    }
    if (!Number.isNaN(bpmminNum) && current.bpmMin !== "") {
      params.bpmmin = bpmminNum;
    }
    if (!Number.isNaN(bpmmaxNum) && current.bpmMax !== "") {
      params.bpmmax = bpmmaxNum;
    }
    if (!Number.isNaN(lenminNum) && current.lengthMin !== "") {
      params.lenmin = lenminNum;
    }
    if (!Number.isNaN(lenmaxNum) && current.lengthMax !== "") {
      params.lenmax = lenmaxNum;
    }
    return params;
  };

  const mapToCard = (items: RespStoreListItem[]) =>
    items.map((item) => ({
      ...item,
      cover: coverUrl(item.cover),
      modeLabels: modeLabelsFromMask(item.mode),
    }));

  const formatLength = (value?: number) => {
    if (!value || Number.isNaN(value)) return t("charts.card.lengthUnknown");
    const minutes = Math.floor(value / 60);
    const seconds = Math.max(0, value - minutes * 60);
    const time = `${minutes}:${String(seconds).padStart(2, "0")}`;
    return t("charts.card.length", { value: time });
  };

  const formatBpm = (value?: number) => {
    if (!value || Number.isNaN(value)) return t("charts.card.bpmUnknown");
    return t("charts.card.bpm", { value });
  };

  const formatUpdated = (value?: number) => {
    if (!value) return t("charts.card.updatedUnknown");
    const date = new Date(value * 1000);
    if (Number.isNaN(date.getTime())) return t("charts.card.updatedUnknown");
    return t("charts.card.updated", { time: date.toLocaleDateString() });
  };

  const loadCharts = async (reset = false, activeFilters?: FilterState) => {
    if (loading) return;
    const currentFilters = activeFilters ?? filters;
    setLoading(true);
    setError("");
    try {
      const from = reset ? 0 : next ?? 0;
      const resp = await fetchStoreListV2(buildParams(currentFilters, from), {
        clientVersion: "6.3.22",
      });
      if (resp.code !== 0 || !resp.data) {
        setError(t("charts.error.fetch"));
        if (reset) setCharts([]);
        setHasMore(false);
        setNext(undefined);
        return;
      }
      const mapped = mapToCard(resp.data);
      setCharts((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHasMore(Boolean(resp.hasMore));
      setNext(resp.next);
    } catch (err) {
      console.error(err);
      setError(t("charts.error.network"));
      if (reset) setCharts([]);
      setHasMore(false);
      setNext(undefined);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitFilters = (e: FormEvent) => {
    e.preventDefault();
    loadCharts(true);
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
    loadCharts(true, { ...defaultFilters });
  };

  useEffect(() => {
    loadCharts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <section className="chart-hero">
        <div>
          <p className="eyebrow">{t("charts.eyebrow")}</p>
          <h1>{t("charts.title")}</h1>
          <p>{t("charts.desc")}</p>
        </div>
        <div className="chart-hero-card">
          <p className="eyebrow">{t("charts.filter.title")}</p>
          <form className="chart-filters chart-list-filters" onSubmit={onSubmitFilters}>
            {/* 第一排：keyword 独占 */}
            <label className="chart-field chart-field-full">
              <span>{t("charts.filter.keyword")}</span>
              <input
                type="search"
                value={filters.keyword}
                placeholder={t("charts.filter.keywordPlaceholder")}
                onChange={(e) =>
                  setFilters({ ...filters, keyword: e.target.value })
                }
              />
            </label>
            {/* 第二排：mode, status, freestyle */}
            <label className="chart-field">
              <span>{t("charts.filter.mode")}</span>
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
            <MultiSelect
              label={t("charts.filter.type")}
              options={typeOptions}
              selected={filters.types}
              onChange={(values) => setFilters({ ...filters, types: values })}
              placeholder={t("charts.filter.typeAll")}
            />
            <label className="chart-field">
              <span>{t("charts.filter.free")}</span>
              <select
                value={filters.free}
                onChange={(e) =>
                  setFilters({ ...filters, free: Number(e.target.value) })
                }
              >
                {freeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {/* 更多筛选切换按钮 */}
            <button
              type="button"
              className={`chart-advanced-toggle ${showAdvanced ? 'expanded' : ''}`}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <svg
                className="chart-advanced-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>{t("charts.filter.more")}</span>
              <svg
                className="chart-advanced-chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {/* 高级筛选区域 */}
            {showAdvanced && (
              <div className="chart-advanced-filters">
                <RangeSlider
                  label={t("charts.filter.level")}
                  min={1}
                  max={40}
                  minValue={filters.levelMin}
                  maxValue={filters.levelMax}
                  minPlaceholder={t("charts.filter.levelMin")}
                  maxPlaceholder={t("charts.filter.levelMax")}
                  onMinChange={(val) => setFilters({ ...filters, levelMin: val })}
                  onMaxChange={(val) => setFilters({ ...filters, levelMax: val })}
                />
                <RangeSlider
                  label={t("charts.filter.bpm")}
                  min={100}
                  max={300}
                  step={5}
                  minValue={filters.bpmMin}
                  maxValue={filters.bpmMax}
                  minPlaceholder={t("charts.filter.bpmMin")}
                  maxPlaceholder={t("charts.filter.bpmMax")}
                  onMinChange={(val) => setFilters({ ...filters, bpmMin: val })}
                  onMaxChange={(val) => setFilters({ ...filters, bpmMax: val })}
                />
                <RangeSlider
                  label={t("charts.filter.length")}
                  min={60}
                  max={400}
                  step={10}
                  minValue={filters.lengthMin}
                  maxValue={filters.lengthMax}
                  minPlaceholder={t("charts.filter.lengthMin")}
                  maxPlaceholder={t("charts.filter.lengthMax")}
                  onMinChange={(val) => setFilters({ ...filters, lengthMin: val })}
                  onMaxChange={(val) => setFilters({ ...filters, lengthMax: val })}
                />
              </div>
            )}
            <div className="chart-actions-row">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? t("charts.loading") : t("charts.filter.apply")}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={resetFilters}
                disabled={loading}
              >
                {t("charts.filter.reset")}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("charts.listTitle")}</h2>
          <span className="chart-count">
            {error
              ? error
              : t("charts.results.count", { count: charts.length })}
          </span>
        </div>
        {charts.length ? (
          <div className="chart-grid">
            {charts.map((item) => (
              <ChartCard
                key={item.sid}
                href={`/song/${item.sid}`}
                cover={item.cover}
                title={item.title}
                artist={item.artist}
                badges={item.modeLabels.slice(0, 3).map((label) => (
                  <span className="pill chart-mode-pill" key={label}>
                    {label}
                  </span>
                ))}
                meta={
                  <>
                    <span className="meta-pill">
                      {formatLength(item.length)}
                    </span>
                    <span className="meta-pill">{formatBpm(item.bpm)}</span>
                  </>
                }
                footer={
                  <span className="chart-card-updated">
                    {formatUpdated(item.lastedit)}
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
              ? t("charts.loading")
              : t("charts.results.empty")}
          </div>
        )}
        <div className="chart-actions">
          {hasMore && (
            <LoadMoreButton
              label={t("charts.loadMore")}
              loadingLabel={t("charts.loading")}
              loading={loading}
              onClick={() => loadCharts()}
            />
          )}
        </div>
      </section>

      {auth.modal}
    </PageLayout>
  );
}

export default ChartListPage;
