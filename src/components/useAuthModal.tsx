import { useEffect, useState } from "react";
import AuthModal from "./AuthModal";
import { fetchPlayerInfo, getSession, setSession } from "../network/api";

type AuthMode = "signin" | "signup";

type AuthModalSuccess = {
  username?: string;
};

export const useAuthModal = (options?: {
  onSuccess?: (payload: AuthModalSuccess) => void;
}) => {
  const initialSession = getSession();
  const initialUserName =
    initialSession && initialSession.uid !== 1
      ? initialSession.username
      : undefined;
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [userName, setUserName] = useState<string | undefined>(initialUserName);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const onSignOut = () => {
    setSession(undefined);
    setUserName(undefined);
  };

  useEffect(() => {
    const session = getSession();
    if (!session || session.uid === 1 || userName) return;

    let cancelled = false;
    const loadProfile = async () => {
      try {
        const resp = await fetchPlayerInfo({ uid: session.uid });
        if (resp.code !== 0) return;
        const resolvedName = resp.data?.name ?? resp.data?.username;
        if (!resolvedName || cancelled) return;
        setUserName(resolvedName);
        setSession({ ...session, username: resolvedName });
      } catch (err) {
        console.error(err);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userName]);

  const modal = authOpen ? (
    <AuthModal
      mode={authMode}
      onClose={() => setAuthOpen(false)}
      onSuccess={(payload) => {
        if (payload.username) setUserName(payload.username);
        options?.onSuccess?.(payload);
      }}
    />
  ) : null;

  return {
    userName,
    openAuth,
    onSignOut,
    modal,
    topbarProps: {
      onSignIn: () => openAuth("signin"),
      onSignUp: () => openAuth("signup"),
      onSignOut,
      userName,
    },
  };
};
