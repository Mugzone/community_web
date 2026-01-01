import { useEffect, useState, type FormEvent } from "react";
import { getSession } from "../network/api";
import { useI18n } from "../i18n";
import type { PackBase } from "../network/api";

export type CommentItem = {
  tid: number;
  uid: number;
  name: string;
  time: number;
  content: string;
  num?: number;
  active?: number;
  playTime?: number;
};

export type CommentListResp = {
  code: number;
  data?: CommentItem[];
  next?: number;
  hasMore?: boolean;
};

export type CommentAddResp = {
  code: number;
  tid?: number;
  time?: number;
  num?: number;
};

type CommentThreadProps = {
  fetchComments: (params: { from?: number }) => Promise<CommentListResp>;
  submitComment: (content: string) => Promise<CommentAddResp>;
  deleteComment: (tid: number) => Promise<PackBase>;
  onRequireAuth?: () => void;
};

const formatTime = (ts?: number) => {
  if (!ts) return "";
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

function CommentThread({
  fetchComments,
  submitComment,
  deleteComment,
  onRequireAuth,
}: CommentThreadProps) {
  const { t } = useI18n();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [next, setNext] = useState<number | undefined>();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingTid, setDeletingTid] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const sessionUid = getSession()?.uid;

  const loadComments = async (reset = false) => {
    if (loading || (loadingMore && !reset)) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    setDeleteError("");
    try {
      const resp = await fetchComments({ from: reset ? undefined : next });
      if (resp.code !== 0) {
        setError(t("comment.error.fetch"));
        if (reset) setComments([]);
        setHasMore(false);
        setNext(undefined);
        return;
      }
      const data = resp.data ?? [];
      setComments((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(Boolean(resp.hasMore));
      setNext(resp.next);
    } catch (err) {
      console.error(err);
      setError(t("comment.error.fetch"));
      if (reset) {
        setComments([]);
        setHasMore(false);
        setNext(undefined);
      }
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadComments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const session = getSession();
    if (!session || session.uid === 1) {
      setSubmitError(t("comment.error.auth"));
      onRequireAuth?.();
      return;
    }
    if (!draft.trim()) {
      setSubmitError(t("comment.error.empty"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const resp = await submitComment(draft.trim());
      if (resp.code !== 0) {
        setSubmitError(t("comment.error.post"));
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const newItem: CommentItem = {
        tid: resp.tid ?? now,
        uid: session.uid,
        name: session.uid.toString(),
        time: resp.time ?? now,
        content: draft.trim(),
        num: resp.num,
      };
      setComments((prev) => [newItem, ...prev]);
      setDraft("");
    } catch (err) {
      console.error(err);
      setSubmitError(t("comment.error.post"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tid: number) => {
    if (deletingTid) return;
    const session = getSession();
    if (!session || session.uid === 1) {
      onRequireAuth?.();
      return;
    }
    const target = comments.find((item) => item.tid === tid);
    if (!target || target.uid !== session.uid) return;
    if (!window.confirm(t("comment.confirmDelete"))) return;
    setDeletingTid(tid);
    setDeleteError("");
    try {
      const resp = await deleteComment(tid);
      if (resp.code !== 0) {
        setDeleteError(t("comment.error.delete"));
        return;
      }
      setComments((prev) => prev.filter((item) => item.tid !== tid));
    } catch (err) {
      console.error(err);
      setDeleteError(t("comment.error.delete"));
    } finally {
      setDeletingTid(null);
    }
  };

  return (
    <div className="comment-thread">
      <form className="comment-editor" onSubmit={onSubmit}>
        <label className="comment-label">
          <span>{t("comment.label")}</span>
          <textarea
            value={draft}
            placeholder={t("comment.placeholder")}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
          />
        </label>
        {submitError && <p className="comment-error">{submitError}</p>}
        <div className="comment-editor-actions">
          {sessionUid && (
            <span className="comment-hint">
              {t("comment.currentUser", { uid: sessionUid })}
            </span>
          )}
          <button
            className="btn primary small"
            type="submit"
            disabled={submitting}
          >
            {submitting ? t("comment.submitting") : t("comment.submit")}
          </button>
        </div>
      </form>

      {error && <div className="comment-error">{error}</div>}
      {deleteError && <div className="comment-error">{deleteError}</div>}
      {loading && (
        <div className="comment-skeleton">
          <div className="line wide" />
          <div className="line" />
          <div className="line" />
        </div>
      )}
      {!loading && comments.length === 0 && !error && (
        <div className="comment-empty">{t("comment.empty")}</div>
      )}

      <div className="comment-list">
        {comments.map((item) => (
          <div className="comment-card" key={`${item.tid}-${item.time}`}>
            <div className="comment-header">
              {item.uid ? (
                <a className="comment-user" href={`/player/${item.uid}`}>
                  {item.name || t("comment.user.unknown")}
                </a>
              ) : (
                <strong>{item.name || t("comment.user.unknown")}</strong>
              )}
              <span className="comment-time">{formatTime(item.time)}</span>
              {item.num !== undefined && (
                <span className="pill ghost">#{item.num}</span>
              )}
              {sessionUid === item.uid && (
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={() => handleDelete(item.tid)}
                  disabled={deletingTid === item.tid}
                >
                  {deletingTid === item.tid
                    ? t("comment.deleting")
                    : t("comment.delete")}
                </button>
              )}
            </div>
            <p className="comment-body">{item.content}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="comment-actions">
          <button
            className="btn ghost small"
            type="button"
            onClick={() => loadComments(false)}
            disabled={loadingMore}
          >
            {loadingMore ? t("comment.loading") : t("comment.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}

export default CommentThread;
