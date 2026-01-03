import { useEffect, useMemo, useRef, useState } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { useI18n } from "../i18n";
import {
  fetchSongCharts,
  fetchSongInfo,
  fetchWiki,
  fetchWikiTemplate,
  type RespSongChartsItem,
  type RespSongInfo,
} from "../network/api";
import { chartTypeBadge, coverUrl, modeLabel } from "../utils/formatters";
import { bindHiddenToggles, renderWiki, type WikiTemplate } from "../utils/wiki";
import { applyTemplateHtml, renderTemplateHtml } from "../utils/wikiTemplates";
import "../styles/song.css";
import "../styles/wiki.css";

const parseSongId = () => {
  const match = window.location.pathname.match(/\/song\/(\d+)/);
  if (match?.[1]) return Number(match[1]);
  const search = new URLSearchParams(window.location.search);
  const sid = search.get("sid");
  return sid ? Number(sid) : undefined;
};

const formatSeconds = (value?: number) => {
  if (!value || Number.isNaN(value)) return "";
  const minutes = Math.floor(value / 60);
  const seconds = Math.max(0, value - minutes * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const copyToClipboard = async (value: string) => {
  if (!value) return;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (err) {
      console.error(err);
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch (err) {
    console.error(err);
  }
};

function SongPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const songId = useMemo(() => parseSongId(), []);
  const copyHintTimer = useRef<number | null>(null);
  const [showCopyHint, setShowCopyHint] = useState(false);
  const [info, setInfo] = useState<RespSongInfo>();
  const [charts, setCharts] = useState<RespSongChartsItem[]>([]);
  const [infoError, setInfoError] = useState("");
  const [chartsError, setChartsError] = useState("");
  const [wikiError, setWikiError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [wikiHtml, setWikiHtml] = useState("");
  const [baseWiki, setBaseWiki] = useState("");
  const [wikiTemplates, setWikiTemplates] = useState<WikiTemplate[]>([]);
  const wikiRef = useRef<HTMLDivElement>(null);
  const [templateError, setTemplateError] = useState("");
  const [chartView, setChartView] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("song-chart-view");
    return saved === "list" ? "list" : "grid";
  });

  const handleChartViewChange = (view: "grid" | "list") => {
    setChartView(view);
    localStorage.setItem("song-chart-view", view);
  };
  const [modeFilter, setModeFilter] = useState("all");

  const renderOptions = useMemo(
    () => ({
      hiddenLabel: t("wiki.hiddenLabel"),
      templateLabel: t("wiki.templateLabel"),
      templateLoading: t("wiki.template.loading"),
    }),
    [t]
  );

  const isListView = chartView === "list";
  const availableModes = useMemo(() => {
    const modes = new Map<number, string>();
    charts.forEach((chart) => {
      if (chart.mode === undefined || chart.mode === null) return;
      modes.set(chart.mode, modeLabel(chart.mode));
    });
    return Array.from(modes.entries()).sort((a, b) => a[0] - b[0]);
  }, [charts]);

  useEffect(() => {
    if (modeFilter === "all") return;
    const current = Number(modeFilter);
    if (!availableModes.some(([mode]) => mode === current)) {
      setModeFilter("all");
    }
  }, [availableModes, modeFilter]);

  const filteredCharts = useMemo(() => {
    if (modeFilter === "all") return charts;
    const current = Number(modeFilter);
    return charts.filter((chart) => chart.mode === current);
  }, [charts, modeFilter]);

  const chartTableHead = (
    <div className="song-chart-head">
      <span>
        <label className="song-chart-mode-filter">
          <span>{t("song.charts.table.mode")}</span>
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
          >
            <option value="all">{t("charts.mode.all")}</option>
            {availableModes.map(([mode, label]) => (
              <option key={mode} value={String(mode)}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </span>
      <span>{t("song.charts.table.title")}</span>
      <span>{t("song.charts.table.type")}</span>
      <span>{t("song.charts.table.hot")}</span>
      <span>{t("song.charts.table.creator")}</span>
      <span className="song-chart-updated">{t("song.charts.table.updated")}</span>
    </div>
  );

  useEffect(() => {
    if (!songId || Number.isNaN(songId)) {
      setInfoError(t("song.error.missingId"));
      return;
    }
    let cancelled = false;
    setLoadingInfo(true);
    setInfoError("");
    fetchSongInfo({ sid: songId })
      .then((resp) => {
        if (cancelled) return;
        if (resp.code !== 0) {
          setInfoError(t("song.error.load"));
          return;
        }
        setInfo(resp);
      })
      .catch(() => {
        if (cancelled) return;
        setInfoError(t("song.error.load"));
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });

    setLoadingCharts(true);
    setChartsError("");
    fetchSongCharts({ sid: songId })
      .then((resp) => {
        if (cancelled) return;
        if (resp.code !== 0 || !resp.data) {
          setChartsError(t("song.charts.loadError"));
          setCharts([]);
          return;
        }
        setCharts(resp.data);
      })
      .catch(() => {
        if (cancelled) return;
        setChartsError(t("song.charts.loadError"));
        setCharts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCharts(false);
      });

    setWikiLoading(true);
    setWikiError("");
    fetchWiki({ sid: songId, raw: 1 })
      .then((resp) => {
        if (cancelled) return;
        if (resp.code === -1000) {
          setWikiError(t("common.loginRequired"));
          setWikiHtml("");
          setWikiTemplates([]);
          setBaseWiki("");
          return;
        }
        if (resp.code !== 0 || !resp.wiki) {
          setWikiHtml("");
          setWikiTemplates([]);
          setBaseWiki("");
          setWikiError("");
          return;
        }
        if (resp.raw === false) {
          setBaseWiki(resp.wiki);
          setWikiTemplates([]);
        } else {
          const parsed = renderWiki(resp.wiki, renderOptions);
          setBaseWiki(parsed.html);
          setWikiTemplates(parsed.templates);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setWikiError(t("song.wiki.error"));
        setBaseWiki("");
        setWikiTemplates([]);
        setWikiHtml("");
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [renderOptions, songId, t]);

  useEffect(() => {
    return () => {
      if (copyHintTimer.current) {
        window.clearTimeout(copyHintTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!baseWiki) {
      setWikiHtml("");
      setTemplateError("");
      setTemplateLoading(false);
      return;
    }
    if (!wikiTemplates.length) {
      setWikiHtml(baseWiki);
      setTemplateLoading(false);
      return;
    }
    let cancelled = false;
    const loadTemplates = async () => {
      setTemplateLoading(true);
      setTemplateError("");
      try {
        const blocks = await Promise.all(
          wikiTemplates.map(async (tmpl) => {
            try {
              const resp = await fetchWikiTemplate({
                name: tmpl.name,
                ...tmpl.params,
              });
              if (resp.code !== 0) return renderTemplateHtml(t, tmpl, resp);
              return renderTemplateHtml(t, tmpl, resp);
            } catch (err) {
              console.error(err);
              return `<div class="wiki-template-placeholder wiki-template-warning">${t(
                "wiki.template.error"
              )}</div>`;
            }
          })
        );
        if (cancelled) return;
        const merged = applyTemplateHtml(baseWiki, blocks);
        setWikiHtml(merged);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setTemplateError(t("wiki.template.error"));
        setWikiHtml(baseWiki);
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    };
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [baseWiki, t, wikiTemplates]);

  useEffect(() => bindHiddenToggles(wikiRef.current), [wikiHtml]);

  const infoLength = info?.length
    ? t("charts.card.length", { value: formatSeconds(info.length) })
    : t("charts.card.lengthUnknown");
  const infoBpm = info?.bpm
    ? t("charts.card.bpm", { value: info.bpm })
    : t("charts.card.bpmUnknown");

  const chartTypeLabel = (type?: number) =>
    chartTypeBadge(type)?.label ?? t("song.charts.type.unknown", { value: type ?? "-" });

  const chartUpdatedLabel = (time?: number) => {
    if (!time) return t("charts.card.updatedUnknown");
    const date = new Date(time * 1000);
    if (Number.isNaN(date.getTime())) return t("charts.card.updatedUnknown");
    return date.toLocaleDateString();
  };

  const handleCopySongId = () => {
    if (!songId || Number.isNaN(songId)) return;
    copyToClipboard(`s${songId}`);
    setShowCopyHint(true);
    if (copyHintTimer.current) {
      window.clearTimeout(copyHintTimer.current);
    }
    copyHintTimer.current = window.setTimeout(() => {
      setShowCopyHint(false);
    }, 1600);
  };

  return (
    <PageLayout className="song-page" topbarProps={auth.topbarProps}>
      <header className="song-hero content-container">
        <div
          className="song-cover"
          style={{ backgroundImage: `url(${coverUrl(info?.cover)})` }}
        />
        <div className="song-summary">
          <p className="eyebrow">{t("song.eyebrow")}</p>
          <h1>{info?.titleOrg || info?.title || t("song.placeholder.title")}</h1>
          <p className="song-artist">
            {info?.artistOrg || info?.artist || t("song.placeholder.artist")}
          </p>
          {(info?.titleOrg || info?.artistOrg) && (
            <p className="song-original">
              {info?.title ?? ""}{" "}
              {info?.artist ? `- ${info.artist}` : ""}
            </p>
          )}
          <div className="song-meta-row">
            {songId && !Number.isNaN(songId) && (
              <span
                className="pill ghost copyable"
                role="button"
                tabIndex={0}
                onClick={handleCopySongId}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleCopySongId();
                  }
                }}
              >
                {`s${songId}`}
              </span>
            )}
            {showCopyHint && (
              <span className="copy-hint" role="status" aria-live="polite">
                {t("common.copied")}
              </span>
            )}
            <span className="pill ghost">{infoLength}</span>
            <span className="pill ghost">{infoBpm}</span>

          </div>
          {songId && !Number.isNaN(songId) && (
            <div className="song-actions">
              <a className="btn ghost small" href={`/song/${songId}/edit`}>
                {t("song.edit.open")}
              </a>
            </div>
          )}
          {loadingInfo && !info && (
            <p className="song-loading">{t("charts.loading")}</p>
          )}
          {infoError && <p className="song-error">{infoError}</p>}
        </div>
      </header>

      <main className="content-container">
        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("song.charts.eyebrow")}</p>
              <h2>{t("song.charts.title")}</h2>
            </div>
            <div className="toggle-group song-chart-toggle">
              <button
                className={`toggle-btn ${chartView === "grid" ? "active" : ""}`}
                type="button"
                aria-pressed={chartView === "grid"}
                onClick={() => handleChartViewChange("grid")}
              >
                {t("song.charts.view.grid")}
              </button>
              <button
                className={`toggle-btn ${chartView === "list" ? "active" : ""}`}
                type="button"
                aria-pressed={chartView === "list"}
                onClick={() => handleChartViewChange("list")}
              >
                {t("song.charts.view.list")}
              </button>
            </div>
          </div>
          {chartsError && <div className="song-error">{chartsError}</div>}
          {loadingCharts && !chartsError ? (
            isListView ? (
              <div className="song-chart-table">
                {chartTableHead}
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div className="song-chart-row skeleton" key={idx}>
                    <span className="song-chart-cell" />
                    <span className="song-chart-cell" />
                    <span className="song-chart-cell" />
                    <span className="song-chart-cell" />
                    <span className="song-chart-cell" />
                    <span className="song-chart-cell" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="song-chart-grid">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div className="song-chart-card skeleton" key={idx}>
                    <div className="song-chart-main" />
                    <div className="song-chart-meta-row" />
                    <div className="song-chart-time-row" />
                  </div>
                ))}
              </div>
            )
          ) : charts.length ? (
            isListView ? (
              <div className="song-chart-table">
                {chartTableHead}
                {filteredCharts.length ? (
                  filteredCharts.map((chart) => {
                    const typeBadge = chartTypeBadge(chart.type);
                    return (
                      <div
                        className="song-chart-row"
                        key={chart.cid}
                      >
                        <span className="song-chart-cell">
                          {modeLabel(chart.mode)}
                        </span>
                        <a className="song-chart-title-cell" href={`/chart/${chart.cid}`}>
                          {chart.version || t("song.charts.untitled")}
                        </a>
                        <span className="song-chart-cell">
                          {typeBadge ? (
                            <span className={typeBadge.className}>
                              {typeBadge.label}
                            </span>
                          ) : (
                            <span className="pill ghost">
                              {chartTypeLabel(chart.type)}
                            </span>
                          )}
                        </span>
                        <span className="song-chart-cell">{chart.hot ?? "-"}</span>
                        <span className="song-chart-cell">
                          {chart.uid ? (
                            <a href={`/player/${chart.uid}`}>
                              {chart.creator || t("song.charts.creatorUnknown")}
                            </a>
                          ) : (
                            chart.creator || t("song.charts.creatorUnknown")
                          )}
                        </span>
                        <span className="song-chart-cell song-chart-updated">
                          {chartUpdatedLabel(chart.time)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="song-chart-row song-chart-empty-row">
                    <span>{t("song.charts.empty")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="song-chart-grid">
                {filteredCharts.length ? (
                  filteredCharts.map((chart) => {
                    const typeBadge = chartTypeBadge(chart.type);
                    return (
                      <a
                        className="song-chart-card"
                        href={`/chart/${chart.cid}`}
                        key={chart.cid}
                      >
                        <div className="song-chart-main">
                          <p className="song-chart-title">
                            {chart.version || t("song.charts.untitled")}
                          </p>
                          <div className="song-chart-tags">
                            <span className="pill ghost">
                              {modeLabel(chart.mode)}
                            </span>
                            {typeBadge ? (
                              <span className={typeBadge.className}>
                                {typeBadge.label}
                              </span>
                            ) : (
                              <span className="pill ghost">
                                {chartTypeLabel(chart.type)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="song-chart-meta-row">
                          <span className="song-chart-meta">
                            {chart.creator
                              ? t("song.charts.creator", { name: chart.creator })
                              : t("song.charts.creatorUnknown")}
                          </span>
                        </div>
                        <div className="song-chart-time-row">
                          <span className="song-chart-time">
                            {chartUpdatedLabel(chart.time)}
                          </span>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="song-empty">{t("song.charts.empty")}</div>
                )}
              </div>
            )
          ) : (
            <div className="song-empty">
              {loadingCharts ? t("charts.loading") : t("song.charts.empty")}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("song.wiki.eyebrow")}</p>
              <h2>{t("song.wiki.title")}</h2>
            </div>
            {songId && (
              <a className="link" href={`/wiki/?sid=${songId}`}>
                {t("song.wiki.viewFull")}
              </a>
            )}
          </div>
          {wikiError && <div className="song-error">{wikiError}</div>}
          {(wikiLoading || templateLoading) && !wikiError && (
            <div className="song-wiki-skeleton">
              <div className="line wide" />
              <div className="line" />
              <div className="line" />
            </div>
          )}
          {!wikiLoading && !wikiError && (
            <>
              {templateError && (
                <div className="song-error">{templateError}</div>
              )}
              {wikiHtml ? (
                <div
                  className="wiki-body"
                  ref={wikiRef}
                  dangerouslySetInnerHTML={{ __html: wikiHtml }}
                />
              ) : (
                <div className="song-empty">{t("song.wiki.empty")}</div>
              )}
            </>
          )}
        </section>
      </main>

      {auth.modal}
    </PageLayout>
  );
}

export default SongPage;
