import { useState, type FormEvent } from "react";
import PageLayout from "../components/PageLayout";
import { UseAuthModal } from "../components/UseAuthModal";
import {
  getSession,
  grantPlayerLabels,
  grantPlayerRings,
  revokePlayerLabels,
  revokePlayerRings,
} from "../network/api";
import { isOrgMember } from "../utils/auth";
import "../styles/emiria.css";

type GrantType = "label" | "ring";
type ActionType = "grant" | "revoke";

const grantConfig: Record<
  GrantType,
  {
    title: string;
    desc: string;
    itemLabel: string;
    submitLabel: string;
    itemMin: number;
    itemMax: number;
    placeholder: string;
    successName: string;
  }
> = {
  label: {
    title: "奖状管理",
    desc: "给玩家发放奖状（item: 1000 - 3000）。",
    itemLabel: "奖状 ID（item）",
    submitLabel: "发放奖状",
    itemMin: 1000,
    itemMax: 3000,
    placeholder: "1000",
    successName: "奖状",
  },
  ring: {
    title: "头像框管理",
    desc: "给玩家发放头像框（item: 0 - 1000）。",
    itemLabel: "头像框 ID（item）",
    submitLabel: "发放头像框",
    itemMin: 0,
    itemMax: 1000,
    placeholder: "0",
    successName: "头像框",
  },
};

function EmiriaPage() {
  const auth = UseAuthModal();
  const session = getSession();
  const canManage = isOrgMember(session?.groups ?? []);
  const [serverDenied, setServerDenied] = useState(false);
  const [grantType, setGrantType] = useState<GrantType>("label");
  const [uids, setUids] = useState("");
  const [item, setItem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const current = grantConfig[grantType];

  const showNotFound = !canManage || serverDenied;

  const executeAction = async (action: ActionType) => {
    if (submitting) return;
    const itemID = Number(item.trim());
    if (
      !uids.trim() ||
      !Number.isFinite(itemID) ||
      itemID < current.itemMin ||
      itemID > current.itemMax
    ) {
      setError("参数错误或发放失败");
      setMessage("");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const payload = { uids: uids.trim(), item: itemID };
      const resp =
        grantType === "label"
          ? action === "grant"
            ? await grantPlayerLabels(payload)
            : await revokePlayerLabels(payload)
          : action === "grant"
            ? await grantPlayerRings(payload)
            : await revokePlayerRings(payload);
      if (resp.code === 0) {
        const countText = resp.count ? `，共 ${resp.count} 个玩家` : "";
        if (action === "grant") {
          setMessage(`${current.successName}发放成功${countText}`);
        } else {
          setMessage(`${current.successName}撤销成功${countText}`);
        }
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await executeAction("grant");
  };

  const onRevoke = async () => {
    const ok = window.confirm("确认撤销这些发放记录吗？");
    if (!ok) return;
    await executeAction("revoke");
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
        <h1>{current.title}</h1>
        <p className="emiria-desc">{current.desc}</p>

        <form className="emiria-form" onSubmit={onSubmit}>
          <label className="emiria-field">
            <span>发放内容</span>
            <select
              value={grantType}
              onChange={(event) => {
                const nextType = event.target.value as GrantType;
                setGrantType(nextType);
                setItem("");
                setMessage("");
                setError("");
              }}
            >
              <option value="label">奖状</option>
              <option value="ring">头像框（Avatar Ring）</option>
            </select>
          </label>

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
            <span>{current.itemLabel}</span>
            <input
              type="number"
              min={current.itemMin}
              max={current.itemMax}
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder={current.placeholder}
              required
            />
          </label>

          <div className="emiria-actions">
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "发放中..." : current.submitLabel}
            </button>
            <button className="btn ghost" type="button" disabled={submitting} onClick={onRevoke}>
              {submitting ? "处理中..." : "撤销发放"}
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
