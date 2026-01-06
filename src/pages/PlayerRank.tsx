import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { fetchGlobalRank } from "../network/api";
import type { RespGlobalRankItem } from "../network/api";
import { avatarUidUrl } from "../utils/formatters";
import { useI18n } from "../i18n";
import "../styles/player-rank.css";

type RankType = "exp" | "mm";

const modeMeta = [
  { key: "mode.key", value: 0 },
  // { label: 'Step', value: 1 },
  { key: "mode.catch", value: 3 },
  { key: "mode.taiko", value: 4 },
  { key: "mode.pad", value: 5 },
  { key: "mode.ring", value: 6 },
  { key: "mode.slide", value: 7 },
  { key: "mode.live", value: 8 },
  { key: "mode.cube", value: 9 },
];

function PlayerRankPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const [rankType, setRankType] = useState<RankType>("exp");
  const [mode, setMode] = useState(0);
  const [rows, setRows] = useState<RespGlobalRankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [next, setNext] = useState<number | undefined>();
  const modeOptions = useMemo(
    () =>
      modeMeta.map((item) => ({
        value: item.value,
        label: t(item.key),
      })),
    [t]
  );

  const formatAcc = (acc?: number) => {
    if (acc === undefined || Number.isNaN(acc)) return "-";
    return `${acc.toFixed(2)}%`;
  };

  const loadRank = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const from = reset ? 0 : next ?? 0;
      const resp = await fetchGlobalRank({
        mm: rankType === "mm" ? 1 : 0,
        mode,
        from,
        ver: 0,
      });
      if (resp.code !== 0 || !resp.data) {
        setError(t("rank.error.fetch"));
        setRows(reset ? [] : rows);
        setHasMore(false);
        setNext(undefined);
        return;
      }
      setRows(reset ? resp.data : [...rows, ...resp.data]);
      setHasMore(Boolean(resp.hasMore));
      setNext(resp.next);
    } catch (err) {
      console.error(err);
      setError(t("rank.error.network"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRank(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankType, mode]);

  return (
    <PageLayout topbarProps={auth.topbarProps}>
      <section className="rank-hero">
        <div>
          <p className="eyebrow">{t("rank.eyebrow")}</p>
          <h1>{t("rank.title")}</h1>
          <p>{t("rank.desc")}</p>
          <div className="filters">
            <div className="pill-group">
              <button
                className={`pill-toggle ${rankType === "exp" ? "active" : ""}`}
                type="button"
                onClick={() => setRankType("exp")}
              >
                EXP
              </button>
              <button
                className={`pill-toggle ${rankType === "mm" ? "active" : ""}`}
                type="button"
                onClick={() => setRankType("mm")}
              >
                MM
              </button>
            </div>
            <select
              className="mode-select"
              value={mode}
              onChange={(e) => setMode(Number(e.target.value))}
              aria-label={t("rank.selectMode")}
            >
              {modeOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">{t("rank.about.title")}</p>
          <p>{t("rank.about.desc")}</p>
        </div>
      </section>

      <div className="rank-table-wrap">
        <table className="rank-table rank-table-keep-third">
          <thead>
            <tr>
              <th>#</th>
              <th>{t("rank.table.player")}</th>
              <th>
                {rankType === "mm"
                  ? t("rank.table.score.mm")
                  : t("rank.table.score.exp")}
              </th>
              <th>{t("rank.table.stats")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rank}-${row.uid}`}>
                <td>{row.rank}</td>
                <td className="player-cell" data-rank={row.rank}>
                  <img
                    className="rank-avatar"
                    src={avatarUidUrl(row.uid)}
                    alt={row.username ?? t("rank.table.player")}
                  />
                  <a className="rank-name" href={`/player/${row.uid}`}>
                    {row.username || `${t("rank.table.player")} ${row.uid}`}
                  </a>
                </td>
                <td className="rank-value">{row.value}</td>
                <td>
                  <div className="rank-meta">
                    <span>
                      {t("rank.meta.level", { value: row.level ?? "-" })}
                    </span>
                    <span>
                      {t("rank.meta.play", { value: row.playcount ?? "-" })}
                    </span>
                    <span>
                      {t("rank.meta.acc", { value: formatAcc(row.acc) })}
                    </span>
                    <span>
                      {t("rank.meta.combo", { value: row.combo ?? "-" })}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={4} className="empty">
                  {t("rank.table.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="table-actions">
          <span>
            {error ? error : t("rank.table.showing", { count: rows.length })}
          </span>
          {hasMore && (
            <button
              className="load-more"
              onClick={() => loadRank()}
              disabled={loading}
            >
              {loading ? t("rank.table.loading") : t("rank.table.loadMore")}
            </button>
          )}
        </div>
      </div>
      {auth.modal}
    </PageLayout>
  );
}

export default PlayerRankPage;
