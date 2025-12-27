import { useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { useI18n } from "../i18n";
import { createWikiPage, getSession } from "../network/api";
import { isEditor } from "../utils/auth";
import "../styles/wiki-create.css";

const parseQueryTitle = () => {
  const search = new URLSearchParams(window.location.search);
  const title = search.get("title") ?? "";
  return title.trim();
};

function WikiCreatePage() {
  const { t } = useI18n();
  const initialTitle = useMemo(() => parseQueryTitle(), []);
  const [title, setTitle] = useState(initialTitle);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [helper, setHelper] = useState("");
  const auth = UseAuthModal({
    onSuccess: () => {
      setError("");
    },
  });

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t("wiki.create.missingTitle"));
      return;
    }
    const session = getSession();
    if (!session || session.uid === 1) {
      auth.openAuth("signin");
      setError(t("wiki.create.auth"));
      return;
    }
    if (!isEditor(session.groups)) {
      setError(t("wiki.create.permission"));
      return;
    }
    setSubmitting(true);
    setError("");
    setHelper("");
    try {
      const resp = await createWikiPage({
        uid: session.uid,
        title: trimmed,
        type: 1,
      });
      if (resp.code === -4) {
        setError(t("wiki.create.banned"));
        return;
      }
      if (resp.code === -2) {
        setError(t("wiki.create.missingTitle"));
        return;
      }
      if (resp.code !== 0) {
        setError(t("wiki.create.error"));
        return;
      }
      if (resp.exist) {
        setHelper(t("wiki.create.exists"));
        window.location.href = `/wiki/${resp.exist}`;
        return;
      }
      if (resp.id) {
        window.location.href = `/wiki/${resp.id}`;
        return;
      }
      setError(t("wiki.create.error"));
    } catch (err) {
      console.error(err);
      setError(t("wiki.create.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout className="wiki-create-page" topbarProps={auth.topbarProps}>
      <section className="wiki-create-hero content-container">
        <div>
          <p className="eyebrow">{t("wiki.create.eyebrow")}</p>
          <h1>{t("wiki.create.title")}</h1>
          <p className="wiki-create-subtitle">
            {t("wiki.create.subtitle")}
          </p>
        </div>
      </section>
      <section className="wiki-create-panel content-container">
        <label className="wiki-create-label">
          <span>{t("wiki.create.field.title")}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("wiki.create.placeholder")}
          />
        </label>
        <div className="wiki-create-actions">
          <button
            className="btn primary"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t("wiki.create.submitting") : t("wiki.create.submit")}
          </button>
        </div>
        {error && <div className="wiki-create-error">{error}</div>}
        {!error && helper && <div className="wiki-create-helper">{helper}</div>}
      </section>
      {auth.modal}
    </PageLayout>
  );
}

export default WikiCreatePage;
