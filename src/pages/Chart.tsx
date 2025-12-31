import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommentThread from "../components/CommentThread";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { useI18n } from "../i18n";
import {
  addComment,
  deleteComment as removeComment,
  donateChart,
  fetchChartDonateList,
  fetchChartInfo,
  fetchComments,
  clearChartRanking,
  fetchRankingList,
  fetchWiki,
  fetchWikiTemplate,
  getSession,
  type RespChartDonate,
  type RespChartInfo,
  type RespRanking,
} from "../network/api";
import { avatarUidUrl, chartTypeBadge, coverUrl, modeLabel } from "../utils/formatters";
import { isPublisher } from "../utils/auth";
import { applyTemplateHtml, renderTemplateHtml } from "../utils/wikiTemplates";
import { bindHiddenToggles, renderWiki, type WikiTemplate } from "../utils/wiki";
import "../styles/chart.css";
import "../styles/comment.css";
import "../styles/wiki.css";

const parseChartId = () => {
  const match = window.location.pathname.match(/\/chart\/(\d+)/);
  if (match?.[1]) return Number(match[1]);
  const search = new URLSearchParams(window.location.search);
  const cid = search.get("cid");
  return cid ? Number(cid) : undefined;
};

const computeRating = (like?: number, dislike?: number) => {
  const l = like ?? 0;
  const d = dislike ?? 0;
  const total = l + d;
  if (total < 10) return undefined;
  const positiveRate = l / total;
  const percent = Math.round(positiveRate * 100);
  const score5 = positiveRate * 5;
  return { percent, score5 };
};

const formatSeconds = (value?: number) => {
  if (!value || Number.isNaN(value)) return "";
  const minutes = Math.floor(value / 60);
  const seconds = Math.max(0, value - minutes * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

type RankFilters = {
  pro: boolean;
  sort: "score" | "combo" | "acc";
  mod: "all" | "noMod" | "noSpeed" | "noModNoSpeed";
};

function ChartPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const chartId = useMemo(() => parseChartId(), []);

  const [info, setInfo] = useState<RespChartInfo>();
  const [infoError, setInfoError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [activeTab, setActiveTab] = useState<"ranking" | "comment" | "donate" | "wiki">("ranking");

  const [ranking, setRanking] = useState<RespRanking>();
  const [rankingError, setRankingError] = useState("");
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankFilters, setRankFilters] = useState<RankFilters>({
    pro: false,
    sort: "score",
    mod: "all",
  });

  const [donateList, setDonateList] = useState<RespChartDonate[]>([]);
  const [donateError, setDonateError] = useState("");
  const [donateLoading, setDonateLoading] = useState(false);
  const [donateAmount, setDonateAmount] = useState("10");
  const [donateSubmitting, setDonateSubmitting] = useState(false);

  const [wikiHtml, setWikiHtml] = useState("");
  const [wikiBase, setWikiBase] = useState("");
  const [wikiTemplates, setWikiTemplates] = useState<WikiTemplate[]>([]);
  const [wikiError, setWikiError] = useState("");
  const [wikiLoading, setWikiLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const wikiRef = useRef<HTMLDivElement>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminMessageTone, setAdminMessageTone] = useState<"success" | "error" | "">("");
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!chartId || Number.isNaN(chartId)) {
      setInfoError(t("chart.error.missingId"));
      return;
    }
    let cancelled = false;
    const loadInfo = async () => {
      setLoadingInfo(true);
      setInfoError("");
      try {
        const resp = await fetchChartInfo({ cid: chartId });
        if (cancelled) return;
        if (resp.code !== 0) {
          setInfoError(t("chart.error.load"));
          return;
        }
        setInfo(resp);
      } catch (err) {
        console.error(err);
        if (!cancelled) setInfoError(t("chart.error.load"));
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    };
    loadInfo();
    return () => {
      cancelled = true;
    };
  }, [chartId, t]);

  const buildOrder = (filters: RankFilters) => {
    let order = 0;
    if (filters.sort === "combo") order |= 1;
    if (filters.sort === "acc") order |= 2;
    if (filters.mod === "noMod" || filters.mod === "noModNoSpeed") order |= 4;
    if (filters.mod === "noSpeed" || filters.mod === "noModNoSpeed") order |= 8;
    return order;
  };

  const loadRanking = async (filters = rankFilters) => {
    if (!chartId || Number.isNaN(chartId)) {
      setRankingError(t("chart.error.missingId"));
      setRanking(undefined);
      return;
    }
    setRankingLoading(true);
    setRankingError("");
    try {
      const resp = await fetchRankingList({
        cid: chartId,
        pro: filters.pro ? 1 : 0,
        order: buildOrder(filters),
      });
      if (resp.code !== 0 || !resp.data) {
        setRankingError(t("chart.ranking.error"));
        setRanking(undefined);
        return;
      }
      setRanking(resp);
    } catch (err) {
      console.error(err);
      setRankingError(t("chart.ranking.error"));
      setRanking(undefined);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDonate = useCallback(async () => {
    if (!chartId || Number.isNaN(chartId)) {
      setDonateError(t("chart.error.missingId"));
      setDonateList([]);
      return;
    }
    setDonateLoading(true);
    setDonateError("");
    try {
      const resp = await fetchChartDonateList({ cid: chartId });
      if (resp.code !== 0 || !resp.data) {
        setDonateError(t("chart.donate.error"));
        setDonateList([]);
        return;
      }
      setDonateList(resp.data);
    } catch (err) {
      console.error(err);
      setDonateError(t("chart.donate.error"));
      setDonateList([]);
    } finally {
      setDonateLoading(false);
    }
  }, [chartId, t]);

  useEffect(() => {
    if (activeTab === "donate") {
      loadDonate();
    }
    if (activeTab === "wiki") {
      if (!chartId || Number.isNaN(chartId)) {
        setWikiError(t("chart.error.missingId"));
        setWikiBase("");
        setWikiTemplates([]);
        setWikiHtml("");
        setWikiLoading(false);
        return;
      }
      setWikiError("");
      setWikiLoading(true);
      fetchWiki({ cid: chartId, raw: 1 })
        .then((resp) => {
          if (resp.code === -1000) {
            setWikiError(t('common.loginRequired'))
            setWikiHtml('')
            setWikiTemplates([])
            setWikiBase('')
            return
          }
          if (resp.code !== 0 || !resp.wiki) {
            setWikiHtml("");
            setWikiTemplates([]);
            setWikiBase("");
            return;
          }
          if (resp.raw === false) {
            setWikiBase(resp.wiki);
            setWikiTemplates([]);
          } else {
            const parsed = renderWiki(resp.wiki, {
              hiddenLabel: t("wiki.hiddenLabel"),
              templateLabel: t("wiki.templateLabel"),
              templateLoading: t("wiki.template.loading"),
            });
            setWikiBase(parsed.html);
            setWikiTemplates(parsed.templates);
          }
        })
        .catch((err) => {
          console.error(err);
          setWikiError(t("chart.wiki.error"));
          setWikiBase("");
          setWikiTemplates([]);
          setWikiHtml("");
        })
        .finally(() => setWikiLoading(false));
    }
  }, [activeTab, chartId, loadDonate, t]);

  useEffect(() => {
    if (!wikiBase) {
      setWikiHtml("");
      setTemplateError("");
      setTemplateLoading(false);
      return;
    }
    if (!wikiTemplates.length) {
      setWikiHtml(wikiBase);
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
        const merged = applyTemplateHtml(wikiBase, blocks);
        setWikiHtml(merged);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setTemplateError(t("wiki.template.error"));
        setWikiHtml(wikiBase);
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    };
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [t, wikiBase, wikiTemplates]);

  useEffect(() => bindHiddenToggles(wikiRef.current), [wikiHtml]);

  const rating = computeRating(info?.like, info?.dislike);
  const rankLevel = ranking?.meta?.level;
  const chartType = chartTypeBadge(info?.type);
  const canManageRanking = isPublisher(getSession()?.groups);

  const commentFetcher = async ({ from }: { from?: number }) => {
    const resp = await fetchComments({ cid: chartId ?? 0, from });
    return resp;
  };

  const commentSubmitter = async (content: string) => {
    const resp = await addComment({ cid: chartId ?? 0, content });
    return resp;
  };

  const commentDeleter = async (tid: number) => {
    const resp = await removeComment({ tid });
    return resp;
  };

  const handleDonate = async () => {
    if (!chartId || Number.isNaN(chartId)) return;
    const session = getSession();
    if (!session || session.uid === 1) {
      auth.openAuth("signin");
      return;
    }
    const gold = Number(donateAmount);
    if (!Number.isFinite(gold) || gold <= 0) {
      setDonateError(t("chart.donate.invalid"));
      return;
    }
    setDonateSubmitting(true);
    setDonateError("");
    try {
      const resp = await donateChart({ cid: chartId, gold });
      if (resp.code !== 0) {
        setDonateError(t("chart.donate.error"));
        return;
      }
      setDonateAmount("10");
      loadDonate();
    } catch (err) {
      console.error(err);
      setDonateError(t("chart.donate.error"));
    } finally {
      setDonateSubmitting(false);
    }
  };

  const handleClearRanking = async () => {
    if (!chartId || Number.isNaN(chartId)) return
    if (!canManageRanking) return
    const session = getSession()
    if (!session || session.uid === 1) {
      setAdminMessage(t('common.loginRequired'))
      setAdminMessageTone('error')
      auth.openAuth('signin')
      return
    }
    setAdminLoading(true)
    setAdminMessage('')
    setAdminMessageTone('')
    try {
      const resp = await clearChartRanking({ cid: chartId })
      if (resp.code === -1000) {
        setAdminMessage(t('common.loginRequired'))
        setAdminMessageTone('error')
        auth.openAuth('signin')
        return
      }
      if (resp.code !== 0) {
        setAdminMessage(t('chart.ranking.clearError'))
        setAdminMessageTone('error')
        return
      }
      setAdminMessage(t('chart.ranking.clearSuccess'))
      setAdminMessageTone('success')
      loadRanking()
    } catch (err) {
      console.error(err)
      setAdminMessage(t('chart.ranking.clearError'))
      setAdminMessageTone('error')
    } finally {
      setAdminLoading(false)
    }
  }

  const renderRankingTable = () => {
    if (rankingLoading) {
      return (
        <div className="chart-rank-skeleton">
          <div className="line wide" />
          <div className="line" />
          <div className="line" />
        </div>
      );
    }
    if (rankingError)
      return <div className="chart-rank-empty">{rankingError}</div>;
    const data = ranking?.data ?? [];
    if (!data.length)
      return <div className="chart-rank-empty">{t("chart.ranking.empty")}</div>;
    return (
      <div className="chart-rank-table">
        <div className="chart-rank-head">
          <span>#</span>
          <span>{t("chart.ranking.player")}</span>
          <span>{t("chart.ranking.score")}</span>
          <span>{t("chart.ranking.level")}</span>
          <span>{t("chart.ranking.acc")}</span>
          <span>{t("chart.ranking.combo")}</span>
          <span>{t("chart.ranking.time")}</span>
        </div>
        {data.map((item) => {
          const judgeValue =
            typeof item.judge === "number" && Number.isFinite(item.judge)
              ? item.judge
              : undefined;
          const rankValue =
            typeof item.rank === "number" && Number.isFinite(item.rank)
              ? item.rank
              : undefined;
          const rankMap: Record<number, number> = {
            0: 0,
            1: 5,
            2: 4,
            3: 3,
            4: 2,
            5: 1,
          };
          const rankDisplay =
            rankValue === undefined ? undefined : rankMap[rankValue];
          const rankLabel =
            rankDisplay === undefined ? "-" : `M${rankDisplay}`;
          const judgeClass =
            judgeValue !== undefined && judgeValue >= 0 && judgeValue <= 4
              ? `chart-rank-grade judge-${judgeValue}`
              : "chart-rank-grade";
          return (
            <div
              className="chart-rank-row"
              key={`${item.uid}-${item.time}-${item.score}`}
            >
              <span className="chart-rank-pos">{item.ranking ?? "-"}</span>
              <a className="chart-rank-player" href={`/player/${item.uid}`}>
                <img
                  className="chart-rank-avatar"
                  src={avatarUidUrl(item.uid)}
                  alt={item.username || t("chart.ranking.unknown")}
                />
                <span>{item.username || t("chart.ranking.unknown")}</span>
              </a>
              <span>{item.score}</span>
              <span className={judgeClass}>{rankLabel}</span>
              <span>{`${item.acc?.toFixed(2) ?? "0"}%`}</span>
              <span
                className={item.fc ? "chart-rank-combo is-fc" : "chart-rank-combo"}
              >
                {item.combo}
              </span>
              <span title={item.time ? new Date(item.time * 1000).toLocaleString() : ""}>
                {formatRelativeTime(item.time)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const creatorName = info?.creator || t("chart.placeholder.creator");
  const creatorUid = info?.uid;
  const publisherName = info?.publisher || t("chart.placeholder.publisher");
  const publisherUid = info?.publisherId;
  const formatRelativeTime = (value?: number) => {
    if (!value) return "-";
    const now = Date.now();
    const diffMs = now - value * 1000;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes <= 1) return t("chart.ranking.time.justNow");
    if (diffMinutes < 60) return t("chart.ranking.time.withinHour");
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t("chart.ranking.time.withinDay");
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t("chart.ranking.time.withinWeek");
    if (diffDays < 30) return t("chart.ranking.time.withinMonth");
    return t("chart.ranking.time.days", { value: diffDays });
  };

  return (
    <PageLayout className="chart-page" topbarProps={auth.topbarProps}>
      <header className="chart-hero content-container">
        <div
          className="chart-cover"
          style={{ backgroundImage: `url(${coverUrl(info?.cover)})` }}
        />
        <div className="chart-summary">
          <p className="eyebrow">{t("chart.eyebrow")}</p>
          <h1>{info?.title || t("chart.placeholder.title")}</h1>
          <p className="chart-artist">
            {info?.artist || t("chart.placeholder.artist")}
          </p>
          <p className="chart-version">
            {info?.version || t("chart.placeholder.version")}
          </p>
          <div className="chart-meta-row">
            {info?.sid && (
              <a className="pill ghost" href={`/song/${info.sid}`}>
                {t("chart.meta.song", { id: info.sid })}
              </a>
            )}
            <span className="pill ghost">{modeLabel(info?.mode)}</span>
            {chartType && <span className={chartType.className}>{chartType.label}</span>}
            {info?.freeStyle === 1 && <span className="pill ghost">{t("charts.badge.freestyle")}</span>}
            {info?.length ? (
              <span className="pill ghost">
                {t("charts.card.length", { value: formatSeconds(info.length) })}
              </span>
            ) : null}
            {rankLevel !== undefined && (
              <span className="pill ghost">
                {t("chart.meta.level", { level: rankLevel })}
              </span>
            )}
          </div>
          {chartId && !Number.isNaN(chartId) && (
            <div className="song-actions">
              <a className="btn ghost small" href={`/chart/${chartId}/edit`}>
                {t("chart.edit.open")}
              </a>
            </div>
          )}
          {loadingInfo && (
            <p className="chart-loading">{t("charts.loading")}</p>
          )}
          {infoError && <p className="chart-error">{infoError}</p>}
        </div>
      </header>

      <div className="content-container">
        <section className="chart-score">
          <div className="chart-score-main">
            <p className="eyebrow">{t("chart.score.title")}</p>
            <h2>
              {rating
                ? t("chart.score.value", { value: rating.score5.toFixed(1) })
                : "--"}
            </h2>
            {rating ? (
              <p className="chart-score-sub">
                {t("chart.score.percent", { value: rating.percent })}
              </p>
            ) : null}
          </div>
          <div className="chart-score-meta">
            <div className="chart-score-meta-grid">
              <div className="chart-score-person">
                <p className="chart-score-label">{t("chart.meta.creator")}</p>
                <div className="chart-score-creator">
                  {creatorUid ? (
                    <a
                      className="chart-score-avatar"
                      href={`/player/${creatorUid}`}
                      aria-label={creatorName}
                    >
                      <img src={avatarUidUrl(creatorUid)} alt={creatorName} />
                    </a>
                  ) : (
                    <div className="chart-score-avatar placeholder" aria-hidden="true" />
                  )}
                  <div className="chart-score-creator-info">
                    {creatorUid ? (
                      <a className="chart-score-value link" href={`/player/${creatorUid}`}>
                        {creatorName}
                      </a>
                    ) : (
                      <p className="chart-score-value">{creatorName}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="chart-score-person">
                <p className="chart-score-label">{t("chart.meta.publisher")}</p>
                <div className="chart-score-creator">
                  {publisherUid ? (
                    <a
                      className="chart-score-avatar"
                      href={`/player/${publisherUid}`}
                      aria-label={publisherName}
                    >
                      <img src={avatarUidUrl(publisherUid)} alt={publisherName} />
                    </a>
                  ) : (
                    <div className="chart-score-avatar placeholder" aria-hidden="true" />
                  )}
                  <div className="chart-score-creator-info">
                    {publisherUid ? (
                      <a className="chart-score-value link" href={`/player/${publisherUid}`}>
                        {publisherName}
                      </a>
                    ) : (
                      <p className="chart-score-value">{publisherName}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="chart-tabs">
            <button
              className={activeTab === "ranking" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("ranking")}
            >
              {t("chart.tab.ranking")}
            </button>
            <button
              className={activeTab === "comment" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("comment")}
            >
              {t("chart.tab.comment")}
            </button>
            <button
              className={activeTab === "donate" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("donate")}
            >
              {t("chart.tab.donate")}
            </button>
            <button
              className={activeTab === "wiki" ? "active" : ""}
              type="button"
              onClick={() => setActiveTab("wiki")}
            >
              {t("chart.tab.wiki")}
            </button>
          </div>

          {activeTab === "ranking" && (
            <div className="chart-panel">
              <div className="chart-panel-header">
                <div className="chart-rank-controls">
                  <label>
                    <span>{t("chart.ranking.platform")}</span>
                    <select
                      value={rankFilters.pro ? 1 : 0}
                      onChange={(e) => {
                        const next = { ...rankFilters, pro: e.target.value === "1" };
                        setRankFilters(next);
                        loadRanking(next);
                      }}
                    >
                      <option value={0}>Default</option>
                      <option value={1}>Pro</option>
                    </select>
                  </label>
                  <label>
                    <span>{t("chart.ranking.sort")}</span>
                    <select
                      value={rankFilters.sort}
                      onChange={(e) => {
                        const next = { ...rankFilters, sort: e.target.value as RankFilters["sort"] };
                        setRankFilters(next);
                        loadRanking(next);
                      }}
                    >
                      <option value="score">{t("chart.ranking.sort.score")}</option>
                      <option value="combo">{t("chart.ranking.sort.combo")}</option>
                      <option value="acc">{t("chart.ranking.sort.acc")}</option>
                    </select>
                  </label>
                  <label>
                    <span>{t("chart.ranking.modFilter")}</span>
                    <select
                      value={rankFilters.mod}
                      onChange={(e) => {
                        const next = { ...rankFilters, mod: e.target.value as RankFilters["mod"] };
                        setRankFilters(next);
                        loadRanking(next);
                      }}
                    >
                      <option value="all">{t("chart.ranking.mod.all")}</option>
                      <option value="noMod">{t("chart.ranking.noMod")}</option>
                      <option value="noSpeed">{t("chart.ranking.noSpeed")}</option>
                      <option value="noModNoSpeed">
                        {t("chart.ranking.noModNoSpeed")}
                      </option>
                    </select>
                  </label>
                </div>
                {canManageRanking && (
                  <div className="chart-admin-actions">
                    <button className="btn ghost small" type="button" onClick={handleClearRanking} disabled={adminLoading}>
                      {adminLoading ? t("chart.ranking.clearing") : t("chart.ranking.clear")}
                    </button>
                    {adminMessage && (
                      <p className={`chart-admin-message ${adminMessageTone}`}>{adminMessage}</p>
                    )}
                  </div>
                )}
              </div>
              {renderRankingTable()}
            </div>
          )}

          {activeTab === "comment" && (
            <div className="chart-panel">
              <CommentThread
                fetchComments={commentFetcher}
                submitComment={commentSubmitter}
                deleteComment={commentDeleter}
                onRequireAuth={() => auth.openAuth("signin")}
              />
            </div>
          )}

          {activeTab === "donate" && (
            <div className="chart-panel donate-panel">
              <div className="donate-form">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="10"
                />
                <button
                  className="btn primary small"
                  type="button"
                  onClick={handleDonate}
                  disabled={donateSubmitting}
                >
                  {donateSubmitting
                    ? t("chart.donate.sending")
                    : t("chart.donate.send")}
                </button>
              </div>
              {donateError && <div className="chart-error">{donateError}</div>}
              {donateLoading && (
                <div className="chart-loading">{t("charts.loading")}</div>
              )}
              {!donateLoading && (
                <div className="donate-list">
                  {donateList.length === 0 && (
                    <div className="chart-empty">{t("chart.donate.empty")}</div>
                  )}
                  {donateList.map((item) => (
                    <div
                      className="donate-item"
                      key={`${item.uid}-${item.time}`}
                    >
                      <div>
                        {item.uid ? (
                          <a
                            className="donate-user"
                            href={`/player/${item.uid}`}
                          >
                            {item.username || t("chart.donate.unknown")}
                          </a>
                        ) : (
                          <p className="donate-user">
                            {item.username || t("chart.donate.unknown")}
                          </p>
                        )}
                        <p className="donate-meta">
                          {item.time
                            ? new Date(item.time * 1000).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                      <span className="pill ghost">
                        {t("chart.donate.gold", { value: item.gold })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "wiki" && (
            <div className="chart-panel">
              {chartId && !Number.isNaN(chartId) && (
                <div className="chart-panel-header chart-wiki-header">
                  <span className="chart-wiki-title">{t("chart.tab.wiki")}</span>
                  <a className="link" href={`/wiki/?cid=${chartId}`}>
                    {t("chart.wiki.viewFull")}
                  </a>
                </div>
              )}
              {wikiError && <div className="chart-error">{wikiError}</div>}
              {(wikiLoading || templateLoading) && !wikiError && (
                <div className="wiki-skeleton">
                  <div className="wiki-skeleton-line wide" />
                  <div className="wiki-skeleton-line" />
                  <div className="wiki-skeleton-line" />
                </div>
              )}
              {!wikiLoading && !wikiError && (
                <>
                  {templateError && (
                    <div className="chart-error">{templateError}</div>
                  )}
                  {wikiHtml ? (
                    <div
                      className="wiki-body"
                      ref={wikiRef}
                      dangerouslySetInnerHTML={{ __html: wikiHtml }}
                    />
                  ) : (
                    <div className="chart-empty">{t("chart.wiki.empty")}</div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {auth.modal}
    </PageLayout>
  );
}

export default ChartPage;
