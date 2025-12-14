import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemePreference,
} from "./themeContext";

const THEME_STORAGE_KEY = "malody-theme";

const getStoredPreference = (): ThemePreference | undefined => {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "system" || raw === "dark" || raw === "light") return raw;
  return undefined;
};

const getSystemTheme = (): ResolvedTheme => {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const resolveTheme = (pref: ThemePreference): ResolvedTheme => {
  if (pref === "system") return getSystemTheme();
  return pref;
};

const applyTheme = (pref: ThemePreference) => {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePref = pref;
  document.documentElement.style.colorScheme = resolved;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark";
    return (
      getStoredPreference() ??
      (document.documentElement.dataset.themePref as
        | ThemePreference
        | undefined) ??
      "dark"
    );
  });

  const resolvedTheme = useMemo(() => resolveTheme(preference), [preference]);

  useEffect(() => {
    applyTheme(preference);
    localStorage.setItem(THEME_STORAGE_KEY, preference);

    if (preference !== "system" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = (pref: ThemePreference) => setPreferenceState(pref);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
