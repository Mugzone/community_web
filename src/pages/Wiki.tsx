import { useEffect, useMemo, useRef, useState } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import type { Locale } from "../i18n";
import { useI18n } from "../i18n";
import {
  deleteWikiPage,
  fetchWiki,
  fetchWikiTemplate,
  getSession,
  lockWikiPage,
  saveWiki,
  updateWikiTitle,
  type RespWiki,
} from "../network/api";
import { bindHiddenToggles, renderWiki, type WikiTemplate } from "../utils/wiki";
import { applyTemplateHtml, renderTemplateHtml } from "../utils/wikiTemplates";
import { isOrgMember } from "../utils/auth";
import "../styles/wiki.css";

type WikiContext = "page" | "song" | "chart" | "user";

type WikiParams = {
  pid?: number;
  sid?: number;
  cid?: number;
  touid?: number;
};

const localeToDbLang: Record<Locale, number> = {
  "en-US": 1,
  "zh-CN": 2,
  ja: 4,
};

const dbLangToApi: Record<number, number> = {
  1: 0,
  2: 1,
  4: 3,
};

const dbLangByCode: Record<string, number> = {
  en: 1,
  sc: 2,
  jp: 4,
  ja: 4,
  zh: 2,
  "zh-cn": 2,
};

const dbLangFromParam = (value: string | null) => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized in dbLangByCode) return dbLangByCode[normalized];
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return undefined;
  if (numeric === 1 || numeric === 2 || numeric === 4) return numeric;
  return numeric >= 0 && numeric <= 2 ? [1, 2, 4][numeric] : undefined;
};

const parseLocationParams = () => {
  const search = new URLSearchParams(window.location.search);
  const readNumber = (key: string) => {
    const value = search.get(key);
    if (value === null || value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const pidFromPath = window.location.pathname.match(/\/wiki\/(\d+)/)?.[1];

  return {
    params: {
      pid: pidFromPath ? Number(pidFromPath) : readNumber("pid"),
      sid: readNumber("sid"),
      cid: readNumber("cid"),
      touid: readNumber("touid"),
    },
    lang: dbLangFromParam(search.get("lang")),
  };
};

const buildFallbackTitle = (
  context: WikiContext,
  params: WikiParams,
  t: ReturnType<typeof useI18n>["t"]
) => {
  if (context === "chart" && params.cid)
    return t("wiki.title.chart", { id: params.cid });
  if (context === "song" && params.sid)
    return t("wiki.title.song", { id: params.sid });
  if (context === "user" && params.touid)
    return t("wiki.title.user", { id: params.touid });
  if (params.pid) return t("wiki.title.page", { id: params.pid });
  return t("wiki.title.fallback");
};

function WikiPage() {
  const { t, lang } = useI18n();
  const { params, lang: urlLang } = useMemo(() => parseLocationParams(), []);
  const [langValue, setLangValue] = useState<number>(
    urlLang ?? localeToDbLang[lang] ?? 1
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wikiHtml, setWikiHtml] = useState("");
  const [baseHtml, setBaseHtml] = useState("");
  const [templates, setTemplates] = useState<WikiTemplate[]>([]);
  const [title, setTitle] = useState("");
  const [locked, setLocked] = useState(false);
  const [draft, setDraft] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [pendingSave, setPendingSave] = useState(false);
  const [manageError, setManageError] = useState("");
  const [manageSuccess, setManageSuccess] = useState("");
  const [manageBusy, setManageBusy] = useState(false);
  const auth = UseAuthModal({
    onSuccess: () => {
      if (!pendingSave) return;
      setPendingSave(false);
      handleSave();
    },
  });
  const [templateError, setTemplateError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const context: WikiContext = params.cid
    ? "chart"
    : params.sid
    ? "song"
    : params.touid
    ? "user"
    : "page";
  const hasTarget = Boolean(
    params.pid || params.sid || params.cid || params.touid
  );
  const sessionGroups = getSession()?.groups ?? [];
  const canManageWiki =
    context === "page" && Boolean(params.pid) && isOrgMember(sessionGroups);
  const renderOptions = useMemo(
    () => ({
      hiddenLabel: t("wiki.hiddenLabel"),
      templateLabel: t("wiki.templateLabel"),
      templateLoading: t("wiki.template.loading"),
    }),
    [t]
  );

  const languageOptions = useMemo(
    () => [
      { label: t("wiki.lang.en"), value: 1 },
      { label: t("wiki.lang.zh"), value: 2 },
      { label: t("wiki.lang.ja"), value: 4 },
    ],
    [t]
  );

  useEffect(() => bindHiddenToggles(contentRef.current), [wikiHtml]);

  useEffect(() => {
    if (!hasTarget) {
      setError(t("wiki.error.missingId"));
      setWikiHtml("");
      setTemplates([]);
      setTitle("");
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      setManageError("");
      setManageSuccess("");
      try {
        const resp: RespWiki = await fetchWiki({
          ...params,
          lang: dbLangToApi[langValue] ?? 0,
          raw: 1,
        });
        if (cancelled) return;
        const fallback = buildFallbackTitle(context, params, t);
        setTitle(resp.title ?? fallback);
        if (resp.code === -1000) {
          setError(t("common.loginRequired"));
          setWikiHtml("");
          setTemplates([]);
          setBaseHtml("");
          setDraft("");
          setLocked(false);
          return;
        }
        setLocked(Boolean(resp.locked));
        if (resp.code !== 0 || !resp.wiki) {
          setError(t("wiki.error.notFound"));
          setWikiHtml("");
          setTemplates([]);
          setBaseHtml("");
          setDraft("");
          return;
        }
        if (resp.raw === false) {
          setBaseHtml(resp.wiki);
          setTemplates([]);
          setDraft(resp.wiki);
        } else {
          const parsed = renderWiki(resp.wiki, renderOptions);
          setBaseHtml(parsed.html);
          setTemplates(parsed.templates);
          setDraft(resp.wiki);
        }
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setError(t("wiki.error.load"));
        setWikiHtml("");
        setTemplates([]);
        setBaseHtml("");
        setDraft("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [context, hasTarget, langValue, params, renderOptions, t]);

  const contextLabel = t(`wiki.context.${context}`);
  const livePreview = useMemo(
    () => renderWiki(draft, renderOptions),
    [draft, renderOptions]
  );

  const loadTemplates = async (html: string, tmplList: WikiTemplate[]) => {
    if (!tmplList.length) {
      setWikiHtml(html);
      return;
    }
    setTemplateError("");
    try {
      const blocks = await Promise.all(
        tmplList.map(async (tmpl) => {
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
      const merged = applyTemplateHtml(html, blocks);
      setWikiHtml(merged);
    } catch (err) {
      console.error(err);
      setTemplateError(t("wiki.template.error"));
      setWikiHtml(html);
    } finally {
    }
  };

  useEffect(() => {
    if (!baseHtml) {
      setWikiHtml("");
      setTemplateError("");
      return;
    }
    if (editMode) {
      setWikiHtml(baseHtml);
      return;
    }
    loadTemplates(baseHtml, templates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHtml, templates, editMode]);

  const handleSave = async () => {
    if (saving) return;
    const session = getSession();
    if (!session || session.uid === 1) {
      setPendingSave(true);
      auth.openAuth("signin");
      setSaveError(t("wiki.error.auth"));
      return;
    }
    if (!hasTarget) {
      setSaveError(t("wiki.error.missingId"));
      return;
    }
    setSaveError("");
    setSaveSuccess("");
    setPendingSave(false);
    setSaving(true);
    try {
      const resp = await saveWiki({
        ...params,
        lang: dbLangToApi[langValue] ?? 0,
        wiki: draft,
        uid: session.uid,
      });
      if (resp.code !== 0) {
        if (resp.code === -5) {
          setPendingSave(true);
          auth.openAuth("signin");
          setSaveError(t("wiki.error.auth"));
          return;
        }
        setSaveError(t("wiki.error.save"));
        return;
      }
      const parsed = renderWiki(draft, renderOptions);
      setBaseHtml(parsed.html);
      setTemplates(parsed.templates);
      setSaveSuccess(t("wiki.save.success"));
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setSaveError(t("wiki.error.save"));
    } finally {
      setSaving(false);
    }
  };

  const requireAuth = () => {
    const session = getSession();
    if (!session || session.uid === 1) {
      auth.openAuth("signin");
      setManageError(t("wiki.error.auth"));
      return undefined;
    }
    return session;
  };

  const handleToggleLock = async () => {
    if (!params.pid || manageBusy) return;
    const session = requireAuth();
    if (!session) return;
    setManageBusy(true);
    setManageError("");
    setManageSuccess("");
    const nextLocked = locked ? 0 : 1;
    try {
      const resp = await lockWikiPage({
        pid: params.pid,
        uid: session.uid,
        locked: nextLocked,
      });
      if (resp.code !== 0 && resp.code !== 1) {
        setManageError(t("wiki.manage.error"));
        return;
      }
      setLocked(resp.code === 1);
      setManageSuccess(
        resp.code === 1
          ? t("wiki.manage.lockSuccess")
          : t("wiki.manage.unlockSuccess")
      );
    } catch (err) {
      console.error(err);
      setManageError(t("wiki.manage.error"));
    } finally {
      setManageBusy(false);
    }
  };

  const handleTitleChange = async () => {
    if (!params.pid || manageBusy) return;
    const session = requireAuth();
    if (!session) return;
    const nextTitle = window.prompt(
      t("wiki.manage.titlePrompt"),
      title || t("wiki.title.fallback")
    );
    if (!nextTitle) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    setManageBusy(true);
    setManageError("");
    setManageSuccess("");
    try {
      const resp = await updateWikiTitle({
        pid: params.pid,
        uid: session.uid,
        title: trimmed,
      });
      if (resp.code === -2) {
        setManageError(t("wiki.manage.titleExists"));
        return;
      }
      if (resp.code !== 0) {
        setManageError(t("wiki.manage.error"));
        return;
      }
      setTitle(trimmed);
      setManageSuccess(t("wiki.manage.titleChanged"));
    } catch (err) {
      console.error(err);
      setManageError(t("wiki.manage.error"));
    } finally {
      setManageBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!params.pid || manageBusy) return;
    const session = requireAuth();
    if (!session) return;
    if (!window.confirm(t("wiki.manage.confirmDelete"))) return;
    setManageBusy(true);
    setManageError("");
    setManageSuccess("");
    try {
      const resp = await deleteWikiPage({
        pid: params.pid,
        uid: session.uid,
      });
      if (resp.code !== 0) {
        setManageError(t("wiki.manage.error"));
        return;
      }
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setManageError(t("wiki.manage.error"));
    } finally {
      setManageBusy(false);
    }
  };

  return (
    <PageLayout className="wiki-page" topbarProps={auth.topbarProps}>
      <header className="wiki-hero content-container">
        <div>
          <p className="eyebrow">{t("wiki.eyebrow")}</p>
          <h1>{title || t("wiki.title.fallback")}</h1>
          <div className="wiki-meta-row">
            <span className="pill ghost">{contextLabel}</span>
            {locked && <span className="pill danger">{t("wiki.locked")}</span>}
          </div>
        </div>
        <div className="wiki-controls">
          <label className="wiki-lang-label">
            <span>{t("wiki.langLabel")}</span>
            <select
              value={langValue}
              onChange={(e) => setLangValue(Number(e.target.value))}
            >
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="wiki-lang-hint">{t("wiki.langHint")}</p>
          <div className="wiki-actions">
            {editMode ? (
              <>
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  {t("wiki.edit.cancel")}
                </button>
                <button
                  className="btn primary small"
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("wiki.save.saving") : t("wiki.save")}
                </button>
              </>
            ) : (
              <>
                {canManageWiki && (
                  <>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={handleToggleLock}
                      disabled={manageBusy}
                    >
                      {locked
                        ? t("wiki.manage.unlock")
                        : t("wiki.manage.lock")}
                    </button>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={handleTitleChange}
                      disabled={manageBusy}
                    >
                      {t("wiki.manage.changeTitle")}
                    </button>
                    <button
                      className="btn danger small"
                      type="button"
                      onClick={handleDelete}
                      disabled={manageBusy}
                    >
                      {t("wiki.manage.delete")}
                    </button>
                  </>
                )}
                <button
                  className="btn primary small"
                  type="button"
                  onClick={() => setEditMode(true)}
                >
                  {t("wiki.edit")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="wiki-content content-container">
        {error && <div className="wiki-empty">{error}</div>}
        {loading && !error && (
          <div className="wiki-skeleton">
            <div className="wiki-skeleton-line wide" />
            <div className="wiki-skeleton-line" />
            <div className="wiki-skeleton-line" />
          </div>
        )}
        {!loading && !error && editMode && (
          <div className="wiki-editor">
            <label className="wiki-editor-label">
              {t("wiki.editing")}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("wiki.draft.placeholder")}
              />
            </label>
            <div className="wiki-editor-feedback">
              {saveError && <p className="wiki-error">{saveError}</p>}
              {saveSuccess && <p className="wiki-success">{saveSuccess}</p>}
              {locked && <p className="wiki-warning">{t("wiki.locked")}</p>}
            </div>
            <div className="wiki-editor-preview">
              <p className="wiki-preview-label">{t("wiki.preview")}</p>
              <div
                className="wiki-body"
                dangerouslySetInnerHTML={{ __html: livePreview.html }}
              />
            </div>
          </div>
        )}
        {!loading && !error && !editMode && (
          <>
            {templateError && <div className="wiki-error">{templateError}</div>}
            {saveError && <div className="wiki-error">{saveError}</div>}
            {saveSuccess && <div className="wiki-success">{saveSuccess}</div>}
            {manageError && <div className="wiki-error">{manageError}</div>}
            {manageSuccess && (
              <div className="wiki-success">{manageSuccess}</div>
            )}
            {wikiHtml ? (
              <div
                className="wiki-body"
                ref={contentRef}
                dangerouslySetInnerHTML={{ __html: wikiHtml }}
              />
            ) : (
              <div className="wiki-empty">{t("wiki.error.empty")}</div>
            )}
          </>
        )}
      </section>

      {auth.modal}
    </PageLayout>
  );
}

export default WikiPage;
