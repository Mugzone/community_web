import { useEffect, useMemo, useState } from "react";
import CommentThread from "../components/CommentThread";
import PageLayout from "../components/PageLayout";
import { useAuthModal } from "../components/UseAuthModal";
import { useI18n, type Locale } from "../i18n";
import {
  addComment,
  buySkin,
  deleteComment as removeComment,
  fetchComments,
  fetchSkinDetail,
  fetchWiki,
  fetchWikiTemplate,
  getSession,
  type RespSkinBuyData,
  type RespSkinListItem,
} from "../network/api";
import { coverUrl, modeLabelsFromMask } from "../utils/formatters";
import { renderWiki, type WikiTemplate } from "../utils/wiki";
import { applyTemplateHtml, renderTemplateHtml } from "../utils/wikiTemplates";
import "../styles/skin-detail.css";
import "../styles/comment.css";
import "../styles/wiki.css";

type SkinDetailInfo = RespSkinListItem & {
  coverUrl: string;
  previewImages: string[];
  modeLabels: string[];
  isBought?: boolean;
  sales?: number;
};

const localeToLang: Record<Locale, number> = {
  "en-US": 0,
  "zh-CN": 1,
  ja: 2,
};

const SKIN_COMMENT_OFFSET = 4000000;

const parseSkinId = () => {
  const detailMatch = window.location.pathname.match(
    /\/store\/skin\/detail\/(\d+)/
  );
  if (detailMatch?.[1]) return Number(detailMatch[1]);
  const shortMatch = window.location.pathname.match(/\/skin\/(\d+)/);
  if (shortMatch?.[1]) return Number(shortMatch[1]);
  const search = new URLSearchParams(window.location.search);
  const sid = search.get("sid") ?? search.get("id");
  return sid ? Number(sid) : undefined;
};

const formatUpdated = (value?: number) => {
  if (!value) return "";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
};

function SkinDetailPage() {
  const { t, lang } = useI18n();
  const auth = useAuthModal();
  const skinId = useMemo(() => parseSkinId(), []);
  const commentCid = skinId ? skinId + SKIN_COMMENT_OFFSET : undefined;
  const langValue = localeToLang[lang] ?? 0;

  const [skin, setSkin] = useState<SkinDetailInfo>();
  const [infoError, setInfoError] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseData, setPurchaseData] = useState<RespSkinBuyData>();

  const [wikiHtml, setWikiHtml] = useState("");
  const [wikiBase, setWikiBase] = useState("");
  const [wikiTemplates, setWikiTemplates] = useState<WikiTemplate[]>([]);
  const [wikiError, setWikiError] = useState("");
  const [wikiLoading, setWikiLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const renderOptions = useMemo(
    () => ({
      hiddenLabel: t("wiki.hiddenLabel"),
      templateLabel: t("wiki.templateLabel"),
      templateLoading: t("wiki.template.loading"),
    }),
    [t]
  );

  useEffect(() => {
    if (!skinId || Number.isNaN(skinId)) {
      setInfoError(t("skinDetail.error.missingId"));
      setSkin(undefined);
      return;
    }
    let cancelled = false;
    const loadSkin = async () => {
      setLoadingInfo(true);
      setInfoError("");
      try {
        const resp = await fetchSkinDetail({ sid: skinId });
        if (cancelled) return;
        const item = resp.data?.[0];
        if (resp.code !== 0 || !item) {
          setInfoError(t("skinDetail.error.notFound"));
          setSkin(undefined);
          return;
        }
        const mapped: SkinDetailInfo = {
          ...item,
          coverUrl: coverUrl(item.cover),
          previewImages: item.preview
            ? item.preview
                .split("|")
                .filter(Boolean)
                .map((img) => coverUrl(img))
            : [],
          modeLabels: modeLabelsFromMask(item.mode),
          isBought: item.buy,
          sales: item.hot,
        };
        setSkin(mapped);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setInfoError(t("skinDetail.error.load"));
        setSkin(undefined);
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    };
    loadSkin();
    return () => {
      cancelled = true;
    };
  }, [skinId, t]);

  useEffect(() => {
    if (!skinId) {
      setWikiBase("");
      setWikiTemplates([]);
      setWikiHtml("");
      setWikiError(t("skinDetail.error.missingId"));
      return;
    }
    let cancelled = false;
    setWikiLoading(true);
    setWikiError("");
    fetchWiki({ sid: skinId, lang: langValue, raw: 1 })
      .then((resp) => {
        if (cancelled) return;
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
          const parsed = renderWiki(resp.wiki, renderOptions);
          setWikiBase(parsed.html);
          setWikiTemplates(parsed.templates);
        }
      })
      .catch((err) => {
        console.error(err);
        if (cancelled) return;
        setWikiError(t("skinDetail.wiki.error"));
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
  }, [langValue, renderOptions, skinId, t]);

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

  const handleBuy = async () => {
    if (!skinId || Number.isNaN(skinId)) return;
    const session = getSession();
    if (!session || session.uid === 1) {
      setPurchaseError(t("skinDetail.error.auth"));
      auth.openAuth("signin");
      return;
    }
    setPurchaseLoading(true);
    setPurchaseError("");
    try {
      const resp = await buySkin({ sid: skinId });
      if (resp.code === -3) {
        setPurchaseError(t("skinDetail.error.insufficient"));
        return;
      }
      if (resp.code !== 0 || !resp.data) {
        setPurchaseError(t("skinDetail.error.buy"));
        return;
      }
      setPurchaseData(resp.data);
      setSkin((prev) => (prev ? { ...prev, isBought: true } : prev));
    } catch (err) {
      console.error(err);
      setPurchaseError(t("skinDetail.error.buy"));
    } finally {
      setPurchaseLoading(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return t("skins.price.free");
    return t("skins.price.value", { value: price });
  };

  const commentFetcher = async ({ from }: { from?: number }) => {
    if (!commentCid) return { code: -1 };
    const resp = await fetchComments({ cid: commentCid, from });
    return resp;
  };

  const commentSubmitter = async (content: string) => {
    if (!commentCid) return { code: -1 };
    const resp = await addComment({ cid: commentCid, content });
    return resp;
  };

  const commentDeleter = async (tid: number) => {
    const resp = await removeComment({ tid });
    return resp;
  };

  const downloadReady = purchaseData?.url;

  return (
    <PageLayout className="skin-detail-page" topbarProps={auth.topbarProps}>
      <header className="skin-detail-hero content-container">
        <div
          className="skin-cover"
          style={{ backgroundImage: `url(${skin?.coverUrl || coverUrl()})` }}
        />
        <div className="skin-summary">
          <p className="eyebrow">{t("skinDetail.eyebrow")}</p>
          <h1>{skin?.name || t("skinDetail.placeholder.name")}</h1>
          <p className="skin-creator">
            {skin?.creator
              ? t("skinDetail.creator", { name: skin.creator })
              : t("skinDetail.creator.unknown")}
          </p>
          <div className="skin-meta-row">
            {skin?.modeLabels.map((label) => (
              <span className="pill ghost" key={label}>
                {label}
              </span>
            ))}
            {skin?.sales !== undefined && (
              <span className="pill ghost">
                {t("skinDetail.sales", { value: skin.sales })}
              </span>
            )}
            {skin?.time && (
              <span className="pill ghost">
                {t("skinDetail.updated", { time: formatUpdated(skin.time) })}
              </span>
            )}
            {skinId && (
              <span className="pill ghost">
                {t("skinDetail.meta.id", { id: skinId })}
              </span>
            )}
          </div>
          {loadingInfo && <p className="skin-loading">{t("skins.loading")}</p>}
          {infoError && <p className="skin-error">{infoError}</p>}
        </div>
      </header>

      <main className="content-container">
        <section className="skin-purchase-card">
          <div>
            <p className="eyebrow">{t("skinDetail.purchase.title")}</p>
            <h2 className="skin-price">{formatPrice(skin?.price)}</h2>
            <p className="skin-price-hint">
              {skin?.price
                ? t("skinDetail.purchase.desc")
                : t("skinDetail.purchase.freeDesc")}
            </p>
          </div>
          <div className="skin-purchase-actions">
            <button
              className="btn primary"
              type="button"
              onClick={handleBuy}
              disabled={purchaseLoading || !skinId}
            >
              {purchaseLoading
                ? t("skinDetail.purchase.loading")
                : skin?.isBought
                ? t("skinDetail.purchase.download")
                : t("skinDetail.purchase.buy")}
            </button>
            {downloadReady && (
              <a
                className="btn ghost"
                href={purchaseData?.url}
                target="_blank"
                rel="noreferrer"
                download={purchaseData?.name}
              >
                {t("skinDetail.purchase.openLink")}
              </a>
            )}
            {purchaseError && <p className="skin-error">{purchaseError}</p>}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("skinDetail.preview.eyebrow")}</p>
              <h2>{t("skinDetail.preview.title")}</h2>
            </div>
            {skin?.previewImages.length ? (
              <span className="chart-count">
                {t("skinDetail.preview.count", {
                  count: skin.previewImages.length,
                })}
              </span>
            ) : null}
          </div>
          {skin?.previewImages.length ? (
            <div className="skin-preview-grid">
              {skin.previewImages.map((img, idx) => (
                <div className="skin-preview-item" key={`${img}-${idx}`}>
                  <img
                    src={img}
                    alt={t("skinDetail.preview.alt", { index: idx + 1 })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="skin-empty">
              {loadingInfo ? t("skins.loading") : t("skinDetail.preview.empty")}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("skinDetail.wiki.eyebrow")}</p>
              <h2>{t("skinDetail.wiki.title")}</h2>
            </div>
            {skinId && (
              <a className="link" href={`/wiki/?sid=${skinId}`}>
                {t("skinDetail.wiki.edit")}
              </a>
            )}
          </div>
          {wikiError && <div className="skin-error">{wikiError}</div>}
          {(wikiLoading || templateLoading) && !wikiError && (
            <div className="skin-wiki-skeleton">
              <div className="line wide" />
              <div className="line" />
              <div className="line" />
            </div>
          )}
          {!wikiLoading && !wikiError && (
            <>
              {templateError && (
                <div className="skin-error">{templateError}</div>
              )}
              {wikiHtml ? (
                <div
                  className="wiki-body"
                  dangerouslySetInnerHTML={{ __html: wikiHtml }}
                />
              ) : (
                <div className="skin-empty">{t("skinDetail.wiki.empty")}</div>
              )}
            </>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("skinDetail.comment.eyebrow")}</p>
              <h2>{t("skinDetail.comment.title")}</h2>
            </div>
          </div>
          <div className="skin-comment-panel">
            <CommentThread
              fetchComments={commentFetcher}
              submitComment={commentSubmitter}
              deleteComment={commentDeleter}
              onRequireAuth={() => auth.openAuth("signin")}
            />
          </div>
        </section>
      </main>

      {auth.modal}
    </PageLayout>
  );
}

export default SkinDetailPage;
