import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { useI18n } from "../i18n";
import {
  createEvent,
  fetchEventCoverUpload,
  fetchEventCharts,
  fetchStoreEvents,
  fetchWikiTemplate,
  getSession,
  type RespEventChartItem,
  type RespStoreEventItem,
  type RespWikiTemplate,
} from "../network/api";
import { coverUrl, modeLabel } from "../utils/formatters";
import { isOrgMember } from "../utils/auth";
import "../styles/song.css";
import "../styles/event-detail.css";
import "../styles/event-edit.css";

const parseEventId = () => {
  const search = new URLSearchParams(window.location.search);
  const raw = search.get("eid") ?? search.get("id");
  return raw ? Number(raw) : undefined;
};

type EventFormState = {
  name: string;
  type: string;
  start: string;
  end: string;
  cover: string;
  wiki: string;
};

type ChartPreview = {
  id: number;
  title?: string;
  artist?: string;
  version?: string;
  cover?: string;
  mode?: number;
};

type ChartPreviewState = {
  status: "loading" | "ready" | "error";
  data?: ChartPreview;
  message?: string;
};

const parseTemplateChart = (resp: RespWikiTemplate): ChartPreview | undefined => {
  if (resp.code !== 0 || !resp.data || typeof resp.data !== "object") return undefined;
  const data = resp.data as Partial<ChartPreview>;
  if (!data.id) return undefined;
  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    version: data.version,
    cover: data.cover,
    mode: data.mode,
  };
};

const normalizeDateInput = (value: string) => value.replace(/\./g, "-");

function EventEditPage() {
  const { t } = useI18n();
  const auth = UseAuthModal();
  const eventId = useMemo(() => parseEventId(), []);

  const [form, setForm] = useState<EventFormState>({
    name: "",
    type: "0",
    start: "",
    end: "",
    cover: "",
    wiki: "",
  });
  const [infoError, setInfoError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [chartIds, setChartIds] = useState<number[]>([]);
  const [chartInput, setChartInput] = useState("");
  const [chartInputError, setChartInputError] = useState("");
  const [chartPreviews, setChartPreviews] = useState<Record<number, ChartPreviewState>>({});
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsError, setChartsError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [createdId, setCreatedId] = useState<number | undefined>();
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverSuccess, setCoverSuccess] = useState("");

  const session = getSession();
  const sessionGroups = session?.groups ?? [];
  const canManage = isOrgMember(sessionGroups);
  const isGuest = !session || session.uid === 1;
  const effectiveEventId = eventId ?? createdId;

  const updateField = (key: keyof EventFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveError("");
    setSaveSuccess("");
  };

  const requireAuth = () => {
    const session = getSession();
    if (!session || session.uid === 1) {
      auth.openAuth("signin");
      return false;
    }
    return true;
  };

  const errorFromCode = (code: number) => {
    if (code === -3) return t("events.edit.error.permission");
    if (code === -4) return t("events.edit.error.limit");
    if (code === -1) return t("events.edit.error.required");
    return t("events.edit.error.save");
  };

  const eventTypeOptions = useMemo(
    () => [
      { value: "0", label: t("events.edit.type.default") },
      { value: "1", label: t("events.edit.type.section") },
      { value: "2", label: t("events.edit.type.newDefault") },
      { value: "3", label: t("events.edit.type.newSection") },
    ],
    [t]
  );

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCoverFile(file);
    setCoverError("");
    setCoverSuccess("");
  };

  const handleCoverUpload = async () => {
    if (!effectiveEventId || Number.isNaN(effectiveEventId)) {
      setCoverError(t("events.edit.cover.needId"));
      return;
    }
    if (!coverFile) {
      setCoverError(t("events.edit.cover.needFile"));
      return;
    }
    if (!requireAuth()) {
      setCoverError(t("events.edit.login"));
      return;
    }
    if (!canManage) {
      setCoverError(t("events.edit.error.permission"));
      return;
    }
    setCoverUploading(true);
    setCoverError("");
    setCoverSuccess("");
    try {
      const sign = await fetchEventCoverUpload({ eid: effectiveEventId, type: 1 });
      if (sign.code !== 0 || !sign.url || !sign.meta) {
        const mod = Math.abs(sign.code) % 1000;
        setCoverError(
          mod === 3 ? t("events.edit.error.permission") : t("events.edit.cover.error")
        );
        return;
      }
      const formData = new FormData();
      Object.entries(sign.meta).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("file", coverFile);

      const res = await fetch(sign.url, { method: "POST", body: formData });
      if (!res.ok) {
        setCoverError(t("events.edit.cover.error"));
        return;
      }

      const policy = sign.meta.policy;
      if (policy) {
        try {
          const decoded = atob(policy);
          const parsed = JSON.parse(decoded) as { "save-key"?: string };
          const saveKey = parsed["save-key"];
          if (saveKey) {
            const cleanKey = saveKey.startsWith("/")
              ? saveKey.slice(1)
              : saveKey;
            updateField("cover", cleanKey);
          }
        } catch (err) {
          console.error(err);
        }
      }

      setCoverSuccess(t("events.edit.cover.success"));
      setCoverFile(undefined);
    } catch (err) {
      console.error(err);
      setCoverError(t("events.edit.cover.error"));
    } finally {
      setCoverUploading(false);
    }
  };

  const loadChartPreview = async (id: number) => {
    setChartPreviews((prev) => ({
      ...prev,
      [id]: { status: "loading" },
    }));
    try {
      const resp = await fetchWikiTemplate({ name: "_chart", id });
      const preview = parseTemplateChart(resp);
      if (!preview) {
        setChartPreviews((prev) => ({
          ...prev,
          [id]: {
            status: "error",
            message: t("events.edit.chart.notFound"),
          },
        }));
        return;
      }
      setChartPreviews((prev) => ({
        ...prev,
        [id]: { status: "ready", data: preview },
      }));
    } catch (err) {
      console.error(err);
      setChartPreviews((prev) => ({
        ...prev,
        [id]: { status: "error", message: t("events.edit.chart.notFound") },
      }));
    }
  };

  const addChartId = () => {
    const value = chartInput.trim();
    const id = Number(value);
    if (!value || !Number.isFinite(id) || id <= 0) {
      setChartInputError(t("events.edit.chart.invalid"));
      return;
    }
    if (chartIds.includes(id)) {
      setChartInputError(t("events.edit.chart.duplicate"));
      return;
    }
    setChartIds((prev) => [...prev, id]);
    setChartInput("");
    setChartInputError("");
    setSaveError("");
    setSaveSuccess("");
    loadChartPreview(id);
  };

  const removeChartId = (id: number) => {
    setChartIds((prev) => prev.filter((item) => item !== id));
    setChartPreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSaveError("");
    setSaveSuccess("");
  };

  useEffect(() => {
    if (!eventId || Number.isNaN(eventId)) return;
    let cancelled = false;

    const loadInfo = async () => {
      setLoadingInfo(true);
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
            setInfoError(t("events.edit.error.load"));
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
          setInfoError(t("events.edit.error.notFound"));
          return;
        }
        if (found) {
          const startValue =
            typeof found.start === "string"
              ? normalizeDateInput(found.start)
              : "";
          const endValue =
            typeof found.end === "string" ? normalizeDateInput(found.end) : "";
          setForm({
            name: found.name ?? "",
            type: found.type !== undefined ? String(found.type) : "0",
            start: startValue,
            end: endValue,
            cover: found.cover ?? "",
            wiki: found.wiki ? String(found.wiki) : "",
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setInfoError(t("events.edit.error.load"));
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    };

    const loadCharts = async () => {
      setChartsLoading(true);
      setChartsError("");
      try {
        const resp = await fetchEventCharts({ eid: eventId });
        if (cancelled) return;
        if (resp.code !== 0 || !resp.data) {
          setChartsError(t("events.edit.charts.error"));
          setChartIds([]);
          return;
        }
        const ids = resp.data.map((item) => item.cid);
        const nextPreviews: Record<number, ChartPreviewState> = {};
        resp.data.forEach((item: RespEventChartItem) => {
          nextPreviews[item.cid] = {
            status: "ready",
            data: {
              id: item.cid,
              title: item.title,
              artist: item.artist,
              version: item.version,
              cover: item.cover,
              mode: item.mode,
            },
          };
        });
        setChartIds(ids);
        setChartPreviews(nextPreviews);
      } catch (err) {
        console.error(err);
        if (!cancelled) setChartsError(t("events.edit.charts.error"));
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

  const handleSave = async () => {
    if (!requireAuth()) {
      setSaveError(t("events.edit.login"));
      return;
    }
    if (!canManage) {
      setSaveError(t("events.edit.error.permission"));
      return;
    }
    const name = form.name.trim();
    const start = normalizeDateInput(form.start.trim());
    const end = normalizeDateInput(form.end.trim());
    const typeValue = Number(form.type);
    const wikiRaw = form.wiki.trim();
    const wikiValue = wikiRaw === "" ? 0 : Number(wikiRaw);
    if (!name || !start || !end || !chartIds.length || !Number.isFinite(typeValue)) {
      setSaveError(t("events.edit.error.required"));
      return;
    }
    if (typeValue < 0 || typeValue > 3) {
      setSaveError(t("events.edit.error.type"));
      return;
    }
    if (!Number.isFinite(wikiValue)) {
      setSaveError(t("events.edit.error.wiki"));
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const resp = await createEvent({
        eid: effectiveEventId,
        name,
        type: typeValue,
        start,
        end,
        cids: JSON.stringify(chartIds),
        cover: form.cover.trim() || undefined,
        wiki: wikiValue,
      });
      if (resp.code <= 0) {
        setSaveError(errorFromCode(resp.code));
        return;
      }
      if (!eventId) {
        setCreatedId(resp.code);
        setSaveSuccess(t("events.edit.created", { id: resp.code }));
      } else {
        setSaveSuccess(t("events.edit.saved"));
      }
    } catch (err) {
      console.error(err);
      setSaveError(t("events.edit.error.save"));
    } finally {
      setSaving(false);
    }
  };

  const showCharts = chartIds.length > 0;

  return (
    <PageLayout className="event-edit-page" topbarProps={auth.topbarProps}>
      <main className="content-container">
        <section className="section song-edit-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("events.edit.eyebrow")}</p>
              <h2>
                {eventId ? t("events.edit.title") : t("events.create.title")}
              </h2>
              <p className="song-edit-desc">{t("events.edit.desc")}</p>
            </div>
            <a className="link" href={eventId ? `/score/event?eid=${eventId}` : "/score/event"}>
              {eventId ? t("events.edit.back") : t("events.create.back")}
            </a>
          </div>

          {loadingInfo && (
            <p className="song-loading">{t("charts.loading")}</p>
          )}
          {infoError && <p className="song-error">{infoError}</p>}

          <div className="song-editor">
            <div className="song-editor-card">
              <div className="song-form-grid">
                <label className="song-field">
                  <span>{t("events.edit.field.name")}</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder={t("events.edit.field.namePlaceholder")}
                    disabled={!canManage}
                  />
                </label>
                <label className="song-field">
                  <span>{t("events.edit.field.type")}</span>
                  <select
                    value={form.type}
                    onChange={(e) => updateField("type", e.target.value)}
                    disabled={!canManage}
                  >
                    {eventTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <small>{t("events.edit.field.typeHint")}</small>
                </label>
                <label className="song-field">
                  <span>{t("events.edit.field.start")}</span>
                  <input
                    type="text"
                    value={form.start}
                    onChange={(e) => updateField("start", e.target.value)}
                    placeholder="YYYY-MM-DD"
                    disabled={!canManage}
                  />
                  <small>{t("events.edit.field.dateHint")}</small>
                </label>
                <label className="song-field">
                  <span>{t("events.edit.field.end")}</span>
                  <input
                    type="text"
                    value={form.end}
                    onChange={(e) => updateField("end", e.target.value)}
                    placeholder="YYYY-MM-DD"
                    disabled={!canManage}
                  />
                  <small>{t("events.edit.field.dateHint")}</small>
                </label>
                <label className="song-field">
                  <span>{t("events.edit.field.cover")}</span>
                  <input
                    type="text"
                    value={form.cover}
                    onChange={(e) => updateField("cover", e.target.value)}
                    placeholder="cover/123!small"
                    disabled={!canManage}
                  />
                  <small>{t("events.edit.field.coverHint")}</small>
                </label>
                <label className="song-field">
                  <span>{t("events.edit.field.wiki")}</span>
                  <input
                    type="text"
                    value={form.wiki}
                    onChange={(e) => updateField("wiki", e.target.value)}
                    placeholder="123"
                    disabled={!canManage}
                  />
                  <small>{t("events.edit.field.wikiHint")}</small>
                </label>
                <label className="song-field">
                  <span>{t("events.edit.field.cids")}</span>
                  <div className="event-edit-chart-input">
                    <input
                      type="text"
                      value={chartInput}
                      onChange={(e) => {
                        setChartInput(e.target.value);
                        setChartInputError("");
                      }}
                      placeholder={t("events.edit.chart.placeholder")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addChartId();
                        }
                      }}
                      disabled={!canManage}
                    />
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={addChartId}
                      disabled={!canManage}
                    >
                      {t("events.edit.chart.add")}
                    </button>
                  </div>
                  <small>{t("events.edit.field.cidsHint")}</small>
                </label>
              </div>

              {chartInputError && <p className="song-error">{chartInputError}</p>}
              {chartsError && <p className="song-error">{chartsError}</p>}

              <div className="song-editor-footer">
                <p className="song-hint">
                  {isGuest
                    ? t("events.edit.login")
                    : canManage
                    ? t("events.edit.hint")
                    : t("events.edit.error.permission")}
                </p>
                {saveError && <p className="song-error">{saveError}</p>}
                {saveSuccess && <p className="song-success">{saveSuccess}</p>}
                {createdId && (
                  <a className="link" href={`/score/event?eid=${createdId}`}>
                    {t("events.edit.createdLink")}
                  </a>
                )}
                <div className="song-editor-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !canManage}
                  >
                    {saving ? t("events.edit.saving") : t("events.edit.save")}
                  </button>
                </div>
              </div>
            </div>

            <div className="song-editor-card song-cover-card">
              <div
                className="song-cover-preview"
                style={{ backgroundImage: `url(${coverUrl(form.cover)})` }}
              />
              <p className="song-hint">{t("events.edit.cover.hint")}</p>
              <label className="song-file-input">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleCoverFileChange}
                  disabled={!canManage}
                />
                <span>
                  {coverFile ? coverFile.name : t("events.edit.cover.select")}
                </span>
              </label>
              {coverError && <p className="song-error">{coverError}</p>}
              {coverSuccess && <p className="song-success">{coverSuccess}</p>}
              <div className="song-editor-actions">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={handleCoverUpload}
                  disabled={coverUploading || !canManage}
                >
                  {coverUploading
                    ? t("events.edit.cover.uploading")
                    : t("events.edit.cover.upload")}
                </button>
              </div>
            </div>
          </div>

          <div className="event-edit-preview-section">
            <div className="event-edit-preview-header">
              <span>{t("events.edit.preview.title")}</span>
              {chartsLoading && <span>{t("charts.loading")}</span>}
            </div>
            {!showCharts ? (
              <div className="chart-empty">{t("events.edit.preview.empty")}</div>
            ) : (
              <div className="event-chart-grid event-edit-preview-grid">
                {chartIds.map((id) => {
                  const preview = chartPreviews[id];
                  if (!preview || preview.status === "loading") {
                    return (
                      <div className="event-chart-card event-edit-preview-card" key={id}>
                        <div className="event-chart-cover event-edit-preview-skeleton" />
                        <div className="event-chart-body">
                          <p className="event-chart-title">{t("charts.loading")}</p>
                        </div>
                      </div>
                    );
                  }
                  if (preview.status === "error") {
                    return (
                      <div className="event-chart-card event-edit-preview-card" key={id}>
                        <div className="event-chart-cover event-edit-preview-error" />
                        <div className="event-chart-body">
                          <p className="event-chart-title">
                            {t("events.edit.chart.notFound")}
                          </p>
                          <p className="event-chart-artist">#{id}</p>
                        </div>
                        {canManage && (
                          <button
                            className="btn ghost small event-edit-preview-remove"
                            type="button"
                            onClick={() => removeChartId(id)}
                          >
                            {t("events.edit.chart.remove")}
                          </button>
                        )}
                      </div>
                    );
                  }
                  const data = preview.data;
                  return (
                    <div className="event-chart-card event-edit-preview-card" key={id}>
                      <div
                        className="event-chart-cover"
                        style={{ backgroundImage: `url(${coverUrl(data?.cover)})` }}
                      />
                      <div className="event-chart-body">
                        <p className="event-chart-title">
                          {data?.title || t("events.detail.charts.untitled")}
                        </p>
                        <p className="event-chart-artist">
                          {data?.artist || t("events.detail.charts.artistUnknown")}
                        </p>
                        <div className="event-chart-tags">
                          {data?.mode !== undefined && (
                            <span className="pill ghost">
                              {modeLabel(data.mode)}
                            </span>
                          )}
                          {data?.version && (
                            <span className="pill ghost">{data.version}</span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <button
                          className="btn ghost small event-edit-preview-remove"
                          type="button"
                          onClick={() => removeChartId(id)}
                        >
                          {t("events.edit.chart.remove")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {auth.modal}
    </PageLayout>
  );
}

export default EventEditPage;
