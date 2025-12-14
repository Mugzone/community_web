import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { RespLogin } from "../network/api";
import { login, register, setSession } from "../network/api";
import { md5 } from "../utils/md5";
import { useI18n } from "../i18n";

type AuthMode = "signin" | "signup";

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
  onSuccess?: (payload: { username?: string; uid?: number }) => void;
};

const ERRORS: Record<string, string> = {
  login: "auth.error.login",
  register: "auth.error.register",
  "-1": "auth.error.-1",
  "-2": "auth.error.-2",
  "-3": "auth.error.-3",
  "-4": "auth.error.-4",
  "-5": "auth.error.-5",
  "-6": "auth.error.-6",
  "-7": "auth.error.-7",
};

const makeError = (code: number, fallback: string) => {
  return ERRORS[String(code)] ?? fallback;
};

function AuthModal({ mode, onClose, onSuccess }: AuthModalProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<AuthMode>(mode);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTab(mode);
    setError("");
  }, [mode]);

  const disableSubmit = useMemo(() => {
    if (loading) return true;
    if (!name.trim() || !password.trim()) return true;
    if (tab === "signup" && !email.trim()) return true;
    return false;
  }, [email, loading, name, password, tab]);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    if (disableSubmit) return;

    setLoading(true);
    setError("");
    try {
      const hashed = md5(password.trim());
      if (!hashed || hashed.length !== 32) {
        setError(t("auth.error.md5"));
        setLoading(false);
        return;
      }

      let resp: RespLogin;
      if (tab === "signin") {
        resp = await login({ name: name.trim(), psw: hashed });
      } else {
        resp = await register({
          name: name.trim(),
          psw: hashed,
          email: email.trim(),
        });
      }

      if (resp.code !== 0) {
        setError(
          t(
            makeError(
              resp.code,
              tab === "signin" ? ERRORS.login : ERRORS.register
            )
          )
        );
        return;
      }

      if (resp.uid && (resp.token || resp.tokenStore)) {
        const fallbackName = name.trim();
        setSession({
          uid: resp.uid,
          key: resp.token ?? resp.tokenStore ?? "",
          storeKey: resp.tokenStore,
          username: resp.username ?? fallbackName,
        });
        onSuccess?.({ username: resp.username ?? fallbackName, uid: resp.uid });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(t(tab === "signin" ? ERRORS.login : ERRORS.register));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-tabs">
            <button
              className={tab === "signin" ? "active" : ""}
              onClick={() => setTab("signin")}
              type="button"
            >
              {t("auth.tab.signIn")}
            </button>
            <button
              className={tab === "signup" ? "active" : ""}
              onClick={() => setTab("signup")}
              type="button"
            >
              {t("auth.tab.signUp")}
            </button>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t("auth.close")}
          >
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="input-label">
            {t("auth.field.username")}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.placeholder.username")}
              autoComplete={tab === "signin" ? "username" : "new-username"}
            />
          </label>

          {tab === "signup" && (
            <label className="input-label">
              {t("auth.field.email")}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.placeholder.email")}
                autoComplete="email"
              />
            </label>
          )}

          <label className="input-label">
            {t("auth.field.password")}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.placeholder.password")}
              autoComplete={
                tab === "signin" ? "current-password" : "new-password"
              }
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button
            className="btn primary full"
            type="submit"
            disabled={disableSubmit}
          >
            {loading
              ? t("auth.submit.loading")
              : tab === "signin"
              ? t("auth.submit.signIn")
              : t("auth.submit.signUp")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
