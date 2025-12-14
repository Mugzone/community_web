import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import { useAuthModal } from "../components/useAuthModal";
import { useI18n } from "../i18n";
import { fetchChartInfo, getSession, saveChartInfo, type RespChartInfo, type RespTagMeta } from "../network/api";
import { hasGroup, isAssistant, isOrgMember, isPublisher } from "../utils/auth";
import "../styles/song.css";
import "../styles/chart.css";

const parseChartId = () => {
  const match = window.location.pathname.match(/\/chart\/(\d+)/);
  if (match?.[1]) return Number(match[1]);
  const search = new URLSearchParams(window.location.search);
  const cid = search.get("cid");
  return cid ? Number(cid) : undefined;
};

const parseLengthInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const minutes = Number(m);
    const seconds = Number(s);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds))
      return Number.NaN;
    return minutes * 60 + seconds;
  }
  return Number(trimmed);
};

type ChartFormState = {
  version: string;
  length: string;
  level: string;
  mode: string;
  free: string;
  type: string;
  hide: string;
  offset: string;
  creator: string;
};

function ChartEditPage() {
  const { t } = useI18n();
  const auth = useAuthModal();
  const chartId = useMemo(() => parseChartId(), []);
  const [info, setInfo] = useState<RespChartInfo>();
  const [infoError, setInfoError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [form, setForm] = useState<ChartFormState>({
    version: "",
    length: "",
    level: "",
    mode: "",
    free: "0",
    type: "",
    hide: "false",
    offset: "",
    creator: "",
  });
  const [tagOptions, setTagOptions] = useState<RespTagMeta[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

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
        const resp = await fetchChartInfo({ cid: chartId, meta: 1 });
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

  useEffect(() => {
    if (!info) return;
    setForm({
      version: info.version ?? "",
      length: info.length ? String(info.length) : "",
      level: info.level ? String(info.level) : "",
      mode: info.mode !== undefined ? String(info.mode) : "",
      free: info.freeStyle !== undefined ? String(info.freeStyle) : "0",
      type: info.type !== undefined ? String(info.type) : "",
      hide: info.hide ? "true" : "false",
      offset: info.offset !== undefined ? String(info.offset) : "",
      creator: info.uid ? String(info.uid) : "",
    });
    setTagOptions(info.tagOptions ?? []);
    setSelectedTags(info.tags ?? []);
  }, [info]);

  const updateField = (key: keyof ChartFormState, value: string) => {
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
    const mod = Math.abs(code) % 1000;
    if (mod === 5) return t("chart.edit.error.permission");
    if (mod === 6) return t("chart.edit.error.forbid");
    if (mod === 2) return t("chart.error.missingId");
    if (mod === 1) return t("chart.edit.error.required");
    return t("chart.edit.error.save");
  };

  const sessionGroups = getSession()?.groups ?? [];
  const hasPubRole = isPublisher(sessionGroups);
  const metaLocked = info?.type === 2 && !isOrgMember(sessionGroups);
  const canEditType = isAssistant(sessionGroups);
  const canEditHide = isOrgMember(sessionGroups);
  const canEditCreator = isOrgMember(sessionGroups);

  const modeOptions = useMemo(
    () => [
      { value: "0", label: t("mode.key") },
      { value: "3", label: t("mode.catch") },
      { value: "4", label: t("mode.pad") },
      { value: "5", label: t("mode.taiko") },
      { value: "6", label: t("mode.ring") },
      { value: "7", label: t("mode.slide") },
      { value: "8", label: t("mode.live") },
      { value: "9", label: t("mode.cube") },
    ],
    [t]
  );

  const typeOptions = useMemo(() => {
    const opts = [
      { value: "0", label: t("chart.edit.type.alpha") },
      { value: "1", label: t("chart.edit.type.beta") },
    ];
    if (hasPubRole) {
      opts.push({ value: "2", label: t("chart.edit.type.stable") });
    }
    return opts;
  }, [hasPubRole, t]);

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
    setSaveError("");
    setSaveSuccess("");
  };

  const handleSave = async () => {
    if (!chartId || Number.isNaN(chartId)) {
      setSaveError(t("chart.error.missingId"));
      return;
    }
    if (!requireAuth()) {
      setSaveError(t("chart.edit.login"));
      return;
    }

    const version = form.version.trim();
    const lengthValue = parseLengthInput(form.length);
    const levelValue = Number(form.level);
    const offsetValue = form.offset.trim() ? Number(form.offset) : 0;
    const modeValue = Number(form.mode);

    if (!metaLocked) {
      if (!version) {
        setSaveError(t("chart.edit.error.required"));
        return;
      }
      if (!Number.isFinite(lengthValue) || lengthValue <= 0) {
        setSaveError(t("chart.edit.error.length"));
        return;
      }
      if (!Number.isFinite(levelValue) || levelValue <= 0) {
        setSaveError(t("chart.edit.error.level"));
        return;
      }
      if (!Number.isFinite(modeValue)) {
        setSaveError(t("chart.edit.error.required"));
        return;
      }
    }

    const typeValue = form.type === "" ? undefined : Number(form.type);
    const freeValue = Number(form.free || "0");
    const creatorValue = Number(form.creator);

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const resp = await saveChartInfo({
        cid: chartId,
        version: metaLocked ? undefined : version,
        length: metaLocked ? undefined : Math.round(lengthValue),
        level: metaLocked ? undefined : Math.round(levelValue),
        mode: metaLocked ? undefined : modeValue,
        free: metaLocked ? undefined : freeValue,
        type: canEditType ? typeValue : undefined,
        hide: metaLocked || !canEditHide ? undefined : form.hide === "true",
        offset: metaLocked
          ? undefined
          : Number.isFinite(offsetValue)
          ? Math.round(offsetValue)
          : undefined,
        creator:
          canEditCreator && Number.isFinite(creatorValue)
            ? creatorValue
            : undefined,
        tags: metaLocked ? undefined : selectedTags,
      });
      if (resp.code !== 0) {
        setSaveError(errorFromCode(resp.code));
        return;
      }
      setSaveSuccess(t("chart.edit.saved"));
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              version: version || prev.version,
              length: metaLocked ? prev.length : Math.round(lengthValue),
              level: metaLocked ? prev.level : Math.round(levelValue),
              mode: metaLocked ? prev.mode : modeValue,
              freeStyle: metaLocked ? prev.freeStyle : freeValue,
              type:
                canEditType && typeValue !== undefined ? typeValue : prev.type,
              hide:
                metaLocked || !canEditHide ? prev.hide : form.hide === "true",
              offset: metaLocked
                ? prev.offset
                : Number.isFinite(offsetValue)
                ? Math.round(offsetValue)
                : prev.offset,
              uid:
                canEditCreator && Number.isFinite(creatorValue)
                  ? creatorValue
                  : prev.uid,
              tags: metaLocked ? prev.tags : selectedTags,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setSaveError(t("chart.edit.error.save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout className="song-page" topbarProps={auth.topbarProps}>
      <main className="content-container">
        <section className="section song-edit-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("chart.edit.eyebrow")}</p>
              <h2>{t("chart.edit.title")}</h2>
              <p className="song-edit-desc">{t("chart.edit.desc")}</p>
            </div>
            {chartId && (
              <a className="link" href={`/chart/${chartId}`}>
                {t("chart.edit.back")}
              </a>
            )}
          </div>
          {loadingInfo && (
            <p className="chart-loading">{t("charts.loading")}</p>
          )}
          {infoError && <p className="chart-error">{infoError}</p>}
          <div className="song-editor">
            <div className="song-editor-card">
              <div className="song-form-grid">
                <label className="song-field">
                  <span>{t("chart.edit.field.version")}</span>
                  <input
                    type="text"
                    value={form.version}
                    placeholder={t("chart.placeholder.version")}
                    onChange={(e) => updateField("version", e.target.value)}
                    disabled={metaLocked}
                  />
                </label>
                <label className="song-field">
                  <span>{t("chart.edit.field.level")}</span>
                  <input
                    type="text"
                    value={form.level}
                    placeholder="10"
                    onChange={(e) => updateField("level", e.target.value)}
                    disabled={metaLocked}
                  />
                </label>
                <label className="song-field">
                  <span>{t("chart.edit.field.length")}</span>
                  <input
                    type="text"
                    value={form.length}
                    placeholder="210"
                    onChange={(e) => updateField("length", e.target.value)}
                    disabled={metaLocked}
                  />
                  <small>{t("song.edit.lengthHint")}</small>
                </label>
                <label className="song-field">
                  <span>{t("chart.edit.field.mode")}</span>
                  <select
                    value={form.mode}
                    onChange={(e) => updateField("mode", e.target.value)}
                    disabled={metaLocked}
                  >
                    <option value="">{t("chart.placeholder.mode")}</option>
                    {modeOptions.map((opt) => (
                      <option value={opt.value} key={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="song-field">
                  <span>{t("chart.edit.field.free")}</span>
                  <select
                    value={form.free}
                    onChange={(e) => updateField("free", e.target.value)}
                    disabled={metaLocked}
                  >
                    <option value="0">{t("chart.edit.free.none")}</option>
                    <option value="1">{t("chart.edit.free.rm")}</option>
                  </select>
                </label>
                {canEditType && (
                  <label className="song-field">
                    <span>{t("chart.edit.field.type")}</span>
                    <select
                      value={form.type}
                      onChange={(e) => updateField("type", e.target.value)}
                    >
                      {typeOptions.map((opt) => (
                        <option value={opt.value} key={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {canEditHide && (
                  <label className="song-field">
                    <span>{t("chart.edit.field.hide")}</span>
                    <select
                      value={form.hide}
                      onChange={(e) => updateField("hide", e.target.value)}
                      disabled={metaLocked}
                    >
                      <option value="false">{t("chart.edit.hide.no")}</option>
                      <option value="true">{t("chart.edit.hide.yes")}</option>
                    </select>
                  </label>
                )}
                <label className="song-field">
                  <span>{t("chart.edit.field.offset")}</span>
                  <input
                    type="text"
                    value={form.offset}
                    placeholder="0"
                    onChange={(e) => updateField("offset", e.target.value)}
                    disabled={metaLocked}
                  />
                </label>
                {canEditCreator && (
                  <label className="song-field">
                    <span>{t("chart.edit.field.creator")}</span>
                    <input
                      type="text"
                      value={form.creator}
                      onChange={(e) => updateField("creator", e.target.value)}
                      placeholder="12345"
                    />
                  </label>
                )}
                {info?.checksum && (
                  <label className="song-field">
                    <span>{t("chart.edit.field.checksum")}</span>
                    <input type="text" value={info.checksum} disabled />
                  </label>
                )}
              </div>
              {tagOptions.length > 0 && !metaLocked && (
                <div className="song-tags">
                  <div className="song-tag-header">
                    <span>{t("chart.edit.field.tags")}</span>
                    <small>{t("chart.edit.tags.hint")}</small>
                  </div>
                  <div className="song-tag-list">
                    {tagOptions.map((tag) => {
                      const active = selectedTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`song-tag${active ? " selected" : ""}`}
                          onClick={() => toggleTag(tag.id)}
                        >
                          <span className="song-tag-name">{tag.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="song-editor-footer">
                <p className="song-hint">
                  {metaLocked
                    ? t("chart.edit.meta.locked")
                    : t("chart.edit.login")}
                </p>
                {saveError && <p className="song-error">{saveError}</p>}
                {saveSuccess && <p className="song-success">{saveSuccess}</p>}
                <div className="song-editor-actions">
                  <button
                    className="btn primary"
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? t("chart.edit.saving") : t("chart.edit.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {auth.modal}
    </PageLayout>
  );
}

export default ChartEditPage;
