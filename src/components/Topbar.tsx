import { useState, useEffect, useRef } from "react";
import { useI18n } from "../i18n";
import { getSession } from "../network/api";
import logo from "../assets/logo.png";

type TopbarProps = {
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut?: () => void;
  userName?: string;
  userId?: number;
};

const navLinks = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.charts", href: "/all_chart" },
  { labelKey: "nav.skins", href: "/store/skin" },
  { labelKey: "nav.events", href: "/score/event" },
  { labelKey: "nav.players", href: "/page/all/player" },
  { labelKey: "nav.talk", href: "https://discord.gg/unk9hgF" },
];

function Topbar({
  onSignIn,
  onSignUp,
  onSignOut,
  userName,
  userId,
}: TopbarProps) {
  const { t, lang, setLang, locales } = useI18n();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const session = getSession();
  const validSession = session && session.uid !== 1 ? session : undefined;
  const uid = userId ?? validSession?.uid;
  const displayName =
    userName ?? validSession?.username ?? (uid ? `UID ${uid}` : undefined);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target as Node)
      ) {
        setShowLangMenu(false);
      }
    };

    if (showLangMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLangMenu]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const currentTheme = html.dataset.theme;
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.dataset.theme = newTheme;
    html.dataset.themePref = newTheme;
    html.style.colorScheme = newTheme;
    localStorage.setItem("malody-theme", newTheme);
  };

  const handleLanguageChange = (locale: (typeof locales)[0]) => {
    setLang(locale);
    setShowLangMenu(false);
  };

  return (
    <nav className="topbar">
      <div className="topbar-container">
        <div className="topbar-left">
          <a className="brand" href="/">
            <img className="brand-logo" src={logo} alt="Malody" width={100} height={92} />
            <span className="brand-text">Malody V</span>
          </a>
          <div className="topbar-nav">
            {navLinks.map((item) => (
              <a key={item.labelKey} href={item.href} className="topbar-link">
                {t(item.labelKey)}
              </a>
            ))}
          </div>
        </div>
        <div className="topbar-actions">
          {displayName ? (
            <>
              {uid ? (
                <a className="user-pill" href={`/player/${uid}`}>
                  {t("topbar.hi", { name: displayName })}
                </a>
              ) : (
                <span className="user-pill">
                  {t("topbar.hi", { name: displayName })}
                </span>
              )}
              <button className="btn-text" type="button" onClick={onSignOut}>
                {t("topbar.signOut")}
              </button>
            </>
          ) : (
            <>
              <button className="btn-text" type="button" onClick={onSignIn}>
                {t("topbar.signIn")}
              </button>
              <button
                className="btn-primary-small"
                type="button"
                onClick={onSignUp}
              >
                {t("topbar.signUp")}
              </button>
            </>
          )}
          <div className="language-selector" ref={langMenuRef}>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label="Select language"
            >
              <span className="material-icons">language</span>
            </button>
            {showLangMenu && (
              <div className="language-menu">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    className={`language-option ${
                      lang === locale ? "active" : ""
                    }`}
                    type="button"
                    onClick={() => handleLanguageChange(locale)}
                  >
                    {t(`language.${locale}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="material-icons">brightness_6</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Topbar;
