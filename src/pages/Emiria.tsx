import { useState, type FormEvent } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import { getSession, grantPlayerLabels } from "../network/api";
import { isOrgMember } from "../utils/auth";
import "../styles/emiria.css";

function EmiriaPage() {
  const auth = UseAuthModal();
  const session = getSession();
  const canManage = isOrgMember(session?.groups ?? []);
  const [serverDenied, setServerDenied] = useState(false);
  const [uids, setUids] = useState("");
  const [item, setItem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const showNotFound = !canManage || serverDenied;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const labelID = Number(item.trim());
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const resp = await grantPlayerLabels({
        uids: uids.trim(),
        item: labelID,
      });
      if (resp.code === 0) {
        const countText = resp.count ? `，共 ${resp.count} 个玩家` : "";
        setMessage(`发放成功${countText}`);
        return;
      }
      if (resp.code === -2) {
        setError("存在无效 uid（目标玩家不存在）");
        return;
      }
      if (resp.code === -404) {
        setServerDenied(true);
        return;
      }
      setError("参数错误或发放失败");
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes("404")) {
        setServerDenied(true);
        return;
      }
      setError("请求失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  if (showNotFound) {
    return (
      <PageLayout className="emiria-page" topbarProps={auth.topbarProps}>
        <section className="content-container emiria-not-found">
          <h1>404</h1>
        </section>
        {auth.modal}
      </PageLayout>
    );
  }

  return (
    <PageLayout className="emiria-page" topbarProps={auth.topbarProps}>
      <section className="content-container emiria-panel">
        <p className="eyebrow">Emiria</p>
        <h1>奖状管理</h1>
        <p className="emiria-desc">给玩家发放奖状（item: 1000 - 3000）。</p>

        <form className="emiria-form" onSubmit={onSubmit}>
          <label className="emiria-field">
            <span>玩家 UID（可多个，用逗号分隔）</span>
            <textarea
              value={uids}
              onChange={(event) => setUids(event.target.value)}
              placeholder="123,456,789"
              rows={4}
              required
            />
          </label>

          <label className="emiria-field">
            <span>奖状 ID（item）</span>
            <input
              type="number"
              min={1000}
              max={3000}
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder="1000"
              required
            />
          </label>

          <div className="emiria-actions">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "发放中..." : "发放奖状"}
            </button>
          </div>
        </form>

        {message && <p className="emiria-success">{message}</p>}
        {error && <p className="emiria-error">{error}</p>}
      </section>

      {auth.modal}
    </PageLayout>
  );
}

export default EmiriaPage;
