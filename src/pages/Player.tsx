import { useEffect, useMemo, useRef, useState } from "react";
import ChartCard from "../components/ChartCard";
import AvatarImage from '../components/AvatarImage'
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { useI18n } from "../i18n";
import {
  fetchPlayerActivity,
  fetchPlayerAllRank,
  fetchPlayerCharts,
  fetchPlayerInfo,
  getSession,
  fetchWiki,
  fetchWikiTemplate,
  type RespPlayerActivityItem,
  type RespPlayerAllRankItem,
  type RespPlayerChartItem,
  type RespPlayerInfoData,
} from "../network/api";
import { avatarUrl, coverUrl, modeLabel } from "../utils/formatters";
import { regionMap } from "../utils/profile";
import { bindHiddenToggles, renderWiki, type WikiTemplate } from "../utils/wiki";
import { applyTemplateHtml, renderTemplateHtml } from "../utils/wikiTemplates";
import "../styles/player.css";
import "../styles/wiki.css";

const parsePlayerId = () => {
  const match = window.location.pathname.match(
    /(?:\/player\/|\/accounts\/user\/)(\d+)/
  );
  if (match?.[1]) return Number(match[1]);
  const search = new URLSearchParams(window.location.search);
  const uid = search.get("uid");
  return uid ? Number(uid) : undefined;
};

const toDateValue = (value?: number | string) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber)) return toDateValue(asNumber);
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }
  if (!Number.isFinite(value)) return undefined;
  const ms = value > 10_000_000_000 ? value : value * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const formatTime = (ts?: number) => {
  const date = toDateValue(ts);
  if (!date) return "";
  return date.toLocaleString();
};

const formatDate = (ts?: number) => {
  const date = toDateValue(ts);
  if (!date) return "";
  return date.toLocaleDateString();
};

const getGroupLabel = (group?: number[]): string | null => {
  if (!group || !group.length) return null;
  // Priority: 3 (Publisher) > 8 (Assistant) > 9 (Organization) > 5 (Editor)
  if (group.includes(3)) return "Publisher";
  if (group.includes(8)) return "Assistant";
  if (group.includes(9)) return "Organization";
  if (group.includes(5)) return "Editor";
  return null;
};


function PlayerPage() {
  const { t, lang } = useI18n();
  const playerId = useMemo(() => parsePlayerId(), []);
  const auth = UseAuthModal();
  const session = getSession();

  const [info, setInfo] = useState<RespPlayerInfoData>();
  const [infoError, setInfoError] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);

  const [activities, setActivities] = useState<RespPlayerActivityItem[]>([]);
  const [activityError, setActivityError] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);

  const [charts, setCharts] = useState<RespPlayerChartItem[]>([]);
  const [chartError, setChartError] = useState("");
  const [chartLoading, setChartLoading] = useState(false);

  const [ranks, setRanks] = useState<RespPlayerAllRankItem[]>([]);
  const [rankError, setRankError] = useState("");
  const [rankLoading, setRankLoading] = useState(false);
  const [wikiHtml, setWikiHtml] = useState("");
  const [wikiBase, setWikiBase] = useState("");
  const [wikiTemplates, setWikiTemplates] = useState<WikiTemplate[]>([]);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError] = useState("");
  const [wikiTemplateLoading, setWikiTemplateLoading] = useState(false);
  const [wikiTemplateError, setWikiTemplateError] = useState("");
  const wikiRef = useRef<HTMLDivElement>(null);
  const infoLoadedRef = useRef<number | undefined>(undefined);
  const activityLoadedRef = useRef<number | undefined>(undefined);
  const chartsLoadedRef = useRef<number | undefined>(undefined);
  const rankLoadedRef = useRef<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<
    "activity" | "charts" | "rank" | "wiki"
  >("activity");
  const initialTabApplied = useRef(false);

  useEffect(() => {
    if (initialTabApplied.current || info?.tab === undefined) return;
    initialTabApplied.current = true;
    const tabMap: Record<number, "activity" | "charts" | "rank" | "wiki"> = {
      0: "activity",
      1: "rank",
      2: "charts",
      3: "wiki",
    };
    const mapped = tabMap[info.tab];
    if (mapped) setActiveTab(mapped);
  }, [info?.tab]);

  useEffect(() => {
    if (!playerId || Number.isNaN(playerId)) {
      setInfoError(t("player.error.missingId"));
      return;
    }
    if (infoLoadedRef.current === playerId) return;
    infoLoadedRef.current = playerId;
    const loadInfo = async () => {
      setInfoLoading(true);
      setInfoError("");
      try {
        const resp = await fetchPlayerInfo({ uid: playerId });
        const data = resp.data ?? (resp as unknown as RespPlayerInfoData);
        if (resp.code !== 0 || !data) {
          setInfoError(t("player.error.info"));
          setInfo(undefined);
          return;
        }
        setInfo({ ...data, uid: data.uid ?? playerId });
      } catch (err) {
        console.error(err);
        setInfoError(t("player.error.info"));
        setInfo(undefined);
      } finally {
        setInfoLoading(false);
      }
    };
    loadInfo();
  }, [playerId, t]);

  useEffect(() => {
    if (!playerId || Number.isNaN(playerId)) {
      setActivityError(t("player.error.missingId"));
      return;
    }
    if (activityLoadedRef.current === playerId) return;
    activityLoadedRef.current = playerId;
    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError("");
      try {
        const resp = await fetchPlayerActivity({ uid: playerId });
        if (resp.code !== 0) {
          setActivityError(t("player.error.activity"));
          setActivities([]);
          return;
        }
        setActivities(resp.data ?? []);
      } catch (err) {
        console.error(err);
        setActivityError(t("player.error.activity"));
        setActivities([]);
      } finally {
        setActivityLoading(false);
      }
    };
    loadActivity();
  }, [playerId, t]);

  useEffect(() => {
    if (!playerId || Number.isNaN(playerId)) {
      setChartError(t("player.error.missingId"));
      return;
    }
    if (chartsLoadedRef.current === playerId) return;
    chartsLoadedRef.current = playerId;
    const loadCharts = async () => {
      setChartLoading(true);
      setChartError("");
      try {
        const resp = await fetchPlayerCharts({ uid: playerId });
        if (resp.code !== 0) {
          setChartError(t("player.error.charts"));
          setCharts([]);
          return;
        }
        setCharts(resp.data ?? []);
      } catch (err) {
        console.error(err);
        setChartError(t("player.error.charts"));
        setCharts([]);
      } finally {
        setChartLoading(false);
      }
    };
    loadCharts();
  }, [playerId, t]);

  useEffect(() => {
    if (!playerId || Number.isNaN(playerId)) {
      setRankError(t("player.error.missingId"));
      return;
    }
    if (rankLoadedRef.current === playerId) return;
    rankLoadedRef.current = playerId;
    const loadRanks = async () => {
      setRankLoading(true);
      setRankError("");
      try {
        const resp = await fetchPlayerAllRank({ uid: playerId });
        if (resp.code !== 0) {
          setRankError(t("player.error.rank"));
          setRanks([]);
          return;
        }
        setRanks(resp.data ?? []);
      } catch (err) {
        console.error(err);
        setRankError(t("player.error.rank"));
        setRanks([]);
      } finally {
        setRankLoading(false);
      }
    };
    loadRanks();
  }, [playerId, t]);

  const renderOptions = useMemo(
    () => ({
      hiddenLabel: t("wiki.hiddenLabel"),
      templateLabel: t("wiki.templateLabel"),
      templateLoading: t("wiki.template.loading"),
    }),
    [t]
  );

  useEffect(() => {
    if (!playerId) {
      setWikiBase("");
      setWikiTemplates([]);
      setWikiHtml("");
      setWikiError("");
      return;
    }
    let cancelled = false;
    const langValue = lang === "zh-CN" ? 1 : lang === "ja" ? 2 : 0;
    setWikiLoading(true);
    setWikiError("");
    fetchWiki({ touid: playerId, lang: langValue, raw: 1 })
      .then((resp) => {
        if (cancelled) return;
        if (resp.code === -1000) {
          setWikiError(t("common.loginRequired"));
          setWikiBase("");
          setWikiTemplates([]);
          setWikiHtml("");
          return;
        }
        if (resp.code !== 0 || !resp.wiki) {
          setWikiBase("");
          setWikiTemplates([]);
          setWikiHtml("");
          return;
        }
        if (resp.raw === false) {
          setWikiBase(resp.wiki);
          setWikiTemplates([]);
        } else {
          const parsed = renderWiki(resp.wiki, renderOptions);
          setWikiBase(parsed.html);
          setWikiTemplates(parsed.templates);
        }
      })
      .catch((err) => {
        console.error(err);
        if (cancelled) return;
        setWikiError(t("player.wiki.error"));
        setWikiBase("");
        setWikiTemplates([]);
        setWikiHtml("");
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, playerId, renderOptions, t]);

  useEffect(() => {
    if (!wikiBase) {
      setWikiHtml("");
      setWikiTemplateError("");
      setWikiTemplateLoading(false);
      return;
    }
    if (!wikiTemplates.length) {
      setWikiHtml(wikiBase);
      setWikiTemplateLoading(false);
      return;
    }
    let cancelled = false;
    const loadTemplates = async () => {
      setWikiTemplateLoading(true);
      setWikiTemplateError("");
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
        setWikiTemplateError(t("wiki.template.error"));
        setWikiHtml(wikiBase);
      } finally {
        if (!cancelled) setWikiTemplateLoading(false);
      }
    };
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [t, wikiBase, wikiTemplates]);

  useEffect(() => {
    if (activeTab !== "wiki") return;
    return bindHiddenToggles(wikiRef.current);
  }, [activeTab, wikiHtml]);

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return t("player.profile.unknown");
    }
    return new Intl.NumberFormat(lang).format(value);
  };

  const formatDuration = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return t("player.profile.unknown");
    }
    const total = Math.max(0, Math.floor(value));
    if (total === 0) return t("player.time.zero");
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const parts: string[] = [];
    if (days) parts.push(t("player.time.days", { value: days }));
    if (hours) parts.push(t("player.time.hours", { value: hours }));
    if (minutes || parts.length === 0) {
      parts.push(t("player.time.minutes", { value: minutes }));
    }
    return parts.join(" ");
  };

  const formatGender = (value?: number) => {
    if (value === 1) return t("player.gender.male");
    if (value === 2) return t("player.gender.female");
    if (value === 3) return t("player.gender.other");
    return t("player.gender.unknown");
  };

  const formatAge = (value?: number | string) => {
    const date = toDateValue(value);
    if (!date) return t("player.profile.unknown");
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && now.getDate() < date.getDate())
    ) {
      age -= 1;
    }
    if (!Number.isFinite(age) || age < 0) return t("player.profile.unknown");
    return String(age);
  };

  const formatRegion = (value?: number) => {
    const region = regionMap[value ?? 0];
    if (!region) return t("player.profile.unknown");
    const localized = t(region.labelKey);
    return localized || region.fallback;
  };

  const displayName =
    info?.name || info?.username || t("player.placeholder.name");
  const wikiLink = playerId ? `/wiki/?touid=${playerId}` : "/wiki/";
  const canEditProfile =
    session && session.uid !== 1 && playerId && session.uid === playerId;

  const lastPlayValue = info?.lastPlay ?? info?.last_play;
  const playTimeValue = info?.playTime ?? info?.play_time;
  const playedTimeValue = info?.playedTime ?? info?.played_time;
  const goldIncomeValue = info?.goldD ?? info?.gold_d;
  const areaValue = info?.area ?? info?.country;
  const stableChartsValue =
    info?.stableCharts ?? info?.stableCount ?? info?.count_2;
  const unstableChartsValue =
    info?.unstableCharts ?? info?.unstableCount ?? info?.count_1;
  const chartSlotValue = info?.chartSlot ?? info?.slot ?? info?.count_0;
  const chartViewAllKeyword = info?.username || displayName;
  const chartViewAllLink = chartViewAllKeyword
    ? `/all_chart?keyword=${encodeURIComponent(chartViewAllKeyword)}`
    : "/all_chart";

  const basicRows = [
    [
      {
        label: t("player.profile.joinedLabel"),
        value: info?.regtime
          ? formatDate(info.regtime)
          : t("player.profile.unknown"),
      },
      {
        label: t("player.profile.lastPlayLabel"),
        value: lastPlayValue
          ? formatDate(lastPlayValue)
          : t("player.profile.lastPlay.never"),
      },
      {
        label: t("player.profile.playTimeLabel"),
        value: formatDuration(playTimeValue),
      },
    ],
    [
      { label: t("player.profile.genderLabel"), value: formatGender(info?.gender) },
      { label: t("player.profile.ageLabel"), value: formatAge(info?.birth) },
      { label: t("player.profile.locationLabel"), value: formatRegion(areaValue) },
    ],
    [
      {
        label: t("player.profile.goldLabel"),
        value: formatNumber(info?.gold),
      },
      ...(goldIncomeValue
        ? [
            {
              label: t("player.profile.incomeLabel"),
              value: formatNumber(goldIncomeValue),
            },
          ]
        : []),
      ...(playedTimeValue
        ? [
            {
              label: t("player.profile.chartsPlayedLabel"),
              value: formatDuration(playedTimeValue),
            },
          ]
        : []),
    ],
    [
      {
        label: t("player.profile.stableChartsLabel"),
        value: formatNumber(stableChartsValue),
      },
      {
        label: t("player.profile.unstableChartsLabel"),
        value: formatNumber(unstableChartsValue),
      },
      ...(chartSlotValue !== undefined && chartSlotValue !== null
        ? [
            {
              label: t("player.profile.chartSlotLabel"),
              value: formatNumber(chartSlotValue),
            },
          ]
        : []),
    ],
  ];

  return (
    <PageLayout className="player-page" topbarProps={auth.topbarProps}>
      <header className="player-hero content-container">
        <AvatarImage
          className="player-avatar"
          src={avatarUrl(info?.avatar, playerId ?? info?.uid)}
          alt={displayName}
          seed={playerId ?? info?.uid}
        />
        <div className="player-identity">
          <p className="eyebrow">{getGroupLabel(info?.group) ?? t("player.eyebrow")}</p>
          <h1>{displayName}</h1>
          {playerId && <p className="player-uid">UID {playerId}</p>}
          {info?.sign && <p className="player-sign">{info.sign}</p>}
          <div className="player-meta">
            {canEditProfile && (
              <a className="btn ghost small player-edit-link" href="/accounts/config/profile">
                {t("player.edit.open")}
              </a>
            )}
          </div>
          <div className="player-basics">
            {basicRows.map((row, rowIndex) => (
              <div className="player-basic-row" key={`row-${rowIndex}`}>
                {row.map((item, itemIndex) => (
                  <div
                    className="player-basic-item"
                    key={`item-${rowIndex}-${item.label}-${itemIndex}`}
                  >
                    <span className="player-basic-label">{item.label}</span>
                    <span className="player-basic-value">{item.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {infoError && <p className="player-error">{infoError}</p>}
          {infoLoading && (
            <p className="player-loading">{t("player.loading")}</p>
          )}
        </div>
      </header>

      <div className="content-container player-body">
        <div className="player-tabs">
          <button
            className={activeTab === "activity" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("activity")}
          >
            {t("player.tab.activity")}
          </button>
          <button
            className={activeTab === "charts" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("charts")}
          >
            {t("player.tab.charts")}
          </button>
          <button
            className={activeTab === "rank" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("rank")}
          >
            {t("player.tab.rank")}
          </button>
          <button
            className={activeTab === "wiki" ? "active" : ""}
            type="button"
            onClick={() => setActiveTab("wiki")}
          >
            {t("player.tab.wiki")}
          </button>
        </div>

        {activeTab === "activity" && (
          <section className="player-section">
            <div className="player-section-head">
              <div>
                <p className="eyebrow">{t("player.section.activity")}</p>
                <h2>{t("player.section.activityTitle")}</h2>
              </div>
            </div>
            {activityError && (
              <div className="player-error">{activityError}</div>
            )}
            {activityLoading && (
              <div className="player-skeleton">
                <div className="line wide" />
                <div className="line" />
                <div className="line" />
              </div>
            )}
            {!activityLoading && activities.length === 0 && !activityError && (
              <div className="player-empty">{t("player.activity.empty")}</div>
            )}
            <div className="player-activity-list">
              {activities.map((item, idx) => (
                <div
                  className="activity-item"
                  key={`${item.time ?? idx}-${item.msg ?? item.text ?? idx}`}
                >
                  <div className="activity-meta">
                    <span className="pill ghost">{formatTime(item.time)}</span>
                    {item.type && (
                      <span className="pill ghost">{item.type}</span>
                    )}
                  </div>
                  <div className="activity-content">
                    <p className="activity-title">
                      {item.msg || item.text || t("player.activity.unknown")}
                    </p>
                    {item.desc && <p className="activity-desc">{item.msg}</p>}
                  </div>
                  {item.link && (
                    <a className="activity-link" href={item.link}>
                      {t("player.activity.link")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "charts" && (
          <section className="player-section">
            <div className="player-section-head">
              <div>
                <p className="eyebrow">{t("player.section.charts")}</p>
                <h2>{t("player.section.chartsTitle")}</h2>
              </div>
            </div>
            {chartError && <div className="player-error">{chartError}</div>}
            {chartLoading && (
              <div className="player-skeleton">
                <div className="line wide" />
                <div className="line" />
                <div className="line" />
              </div>
            )}
            {!chartLoading && charts.length === 0 && !chartError && (
              <div className="player-empty">{t("player.charts.empty")}</div>
            )}
            <div className="player-chart-grid">
              {charts.map((item) => {
                const mode = modeLabel(item.mode);

                return (
                  <ChartCard
                    key={item.cid}
                    href={`/chart/${item.cid}`}
                    cover={coverUrl(item.cover)}
                    title={item.title || t("player.charts.untitled")}
                    artist={item.artist || t("player.charts.unknown")}
                    badges={
                      mode ? (
                        <span className="pill chart-mode-pill">{mode}</span>
                      ) : null
                    }
                    meta={
                      item.version ? (
                        <span className="meta-pill">{item.version}</span>
                      ) : null
                    }
                  />
                );
              })}
            </div>
            {charts.length === 15 && (
              <div className="chart-actions">
                <a className="load-more" href={chartViewAllLink}>
                  {t("player.charts.viewAll")}
                </a>
              </div>
            )}
          </section>
        )}

        {activeTab === "rank" && (
          <section className="player-section">
            <div className="player-section-head">
              <div>
                <p className="eyebrow">{t("player.section.rank")}</p>
                <h2>{t("player.section.rankTitle")}</h2>
              </div>
            </div>
            {rankError && <div className="player-error">{rankError}</div>}
            {rankLoading && (
              <div className="player-skeleton">
                <div className="line wide" />
                <div className="line" />
                <div className="line" />
              </div>
            )}
            {!rankLoading && ranks.length === 0 && !rankError && (
              <div className="player-empty">{t("player.rank.empty")}</div>
            )}
            <div className="player-rank-grid">
              {ranks.map((item, idx) => (
                <div
                  className="player-rank-card"
                  key={`${item.mode ?? idx}-${item.rank ?? idx}`}
                >
                  <div className="player-rank-head">
                    <span className="pill ghost">{modeLabel(item.mode)}</span>
                  </div>
                  <p className="player-rank-pos">
                    {t("player.rank.position", {
                      value:
                        item.gradeRank !== undefined || item.rank !== undefined
                          ? `${item.gradeRank ?? "-"} / ${item.rank ?? "-"}`
                          : t("player.rank.unknown"),
                    })}
                  </p>
                  <div className="player-rank-meta">
                    {item.level !== undefined && (
                      <span>
                        {t("player.stat.level")}: {item.level}
                      </span>
                    )}
                    {item.acc !== undefined && (
                      <span>
                        {t("player.stat.acc")}: {item.acc.toFixed(2)}%
                      </span>
                    )}
                    {item.combo !== undefined && (
                      <span>
                        {t("player.stat.combo")}: {item.combo}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "wiki" && (
          <section className="player-section">
            <div className="player-section-head">
              <div>
                <p className="eyebrow">{t("player.section.wiki")}</p>
              </div>
              <a className="btn ghost small" href={wikiLink}>
                {t("player.wikiLink")}
              </a>
            </div>
            {wikiError && <div className="player-error">{wikiError}</div>}
            {(wikiLoading || wikiTemplateLoading) && !wikiError && (
              <div className="player-skeleton">
                <div className="line wide" />
                <div className="line" />
                <div className="line" />
              </div>
            )}
            {!wikiLoading && !wikiError && (
              <>
                {wikiTemplateError && (
                  <div className="player-error">{wikiTemplateError}</div>
                )}
                {wikiHtml ? (
                  <div
                    className="wiki-body"
                    ref={wikiRef}
                    dangerouslySetInnerHTML={{ __html: wikiHtml }}
                  />
                ) : (
                  <div className="player-wiki-placeholder">
                    <p className="player-wiki-text">{t("player.wiki.empty")}</p>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {auth.modal}
    </PageLayout>
  );
}

export default PlayerPage;
