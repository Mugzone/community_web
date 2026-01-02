import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { useI18n } from "../i18n";
import { getSession } from "../network/api";
import { avatarUidUrl } from "../utils/formatters";
import logo from "../assets/logo.png";

type TopbarProps = {
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut?: () => void;
  userName?: string;
  userId?: number;
};

type SearchType = "wiki" | "player";

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
  const { t } = useI18n();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const initialSearch = useMemo<{ type: SearchType; keyword: string }>(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    return {
      type: typeParam === "player" ? "player" : "wiki",
      keyword: params.get("keyword") ?? "",
    };
  }, []);
  const [searchType, setSearchType] = useState<SearchType>(initialSearch.type);
  const [searchKeyword, setSearchKeyword] = useState(initialSearch.keyword);
  const session = getSession();
  const validSession = session && session.uid !== 1 ? session : undefined;
  const uid = userId ?? validSession?.uid;
  const displayName =
    userName ?? validSession?.username ?? (uid ? `UID ${uid}` : undefined);
  const avatarLabel = displayName ?? t("topbar.profile");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showLangMenu &&
        langMenuRef.current &&
        !langMenuRef.current.contains(target)
      ) {
        setShowLangMenu(false);
      }
      if (
        showNavMenu &&
        navMenuRef.current &&
        !navMenuRef.current.contains(target) &&
        navToggleRef.current &&
        !navToggleRef.current.contains(target)
      ) {
        setShowNavMenu(false);
      }
      if (
        showSearchPanel &&
        searchPanelRef.current &&
        !searchPanelRef.current.contains(target) &&
        searchToggleRef.current &&
        !searchToggleRef.current.contains(target)
      ) {
        setShowSearchPanel(false);
      }
    };

    if (showLangMenu || showNavMenu || showSearchPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLangMenu, showNavMenu, showSearchPanel]);

  const handleSearchSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = searchKeyword.trim();
    if (!value) return;
    const params = new URLSearchParams();
    params.set("type", searchType);
    params.set("keyword", value);
    setShowSearchPanel(false);
    window.location.href = `/search?${params.toString()}`;
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
        <div className="topbar-search">
          <form className="topbar-search-form" onSubmit={handleSearchSubmit}>
            <label className="topbar-search-label">
              <span className="sr-only">{t("search.type.label")}</span>
              <select
                value={searchType}
                onChange={(event) =>
                  setSearchType(event.target.value as SearchType)
                }
              >
                <option value="wiki">{t("search.type.wiki")}</option>
                <option value="player">{t("search.type.player")}</option>
              </select>
            </label>
            <input
              type="search"
              value={searchKeyword}
              placeholder={t("search.keyword.placeholder")}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
            <button className="topbar-search-submit" type="submit">
              {t("search.submit")}
            </button>
          </form>
        </div>
        <div className="topbar-actions">
          <button
            ref={searchToggleRef}
            className="topbar-search-toggle btn-text"
            type="button"
            onClick={() => {
              setShowNavMenu(false);
              setShowSearchPanel((prev) => !prev);
            }}
            aria-expanded={showSearchPanel}
            aria-controls="topbar-search-panel"
          >
            {t("search.submit")}
          </button>
          <button
            ref={navToggleRef}
            className="topbar-nav-toggle btn-text"
            type="button"
            onClick={() => {
              setShowSearchPanel(false);
              setShowNavMenu((prev) => !prev);
            }}
            aria-expanded={showNavMenu}
            aria-controls="topbar-nav-menu"
          >
            {t("topbar.menu")}
          </button>
          {displayName ? (
            <>
              {uid ? (
                <a
                  className="user-avatar"
                  href={`/player/${uid}`}
                  title={displayName}
                  aria-label={avatarLabel}
                >
                  <img src={avatarUidUrl(uid)} alt={avatarLabel} />
                </a>
              ) : (
                <span className="user-avatar" title={displayName}>
                  <span className="user-avatar-placeholder">
                    {displayName?.slice(0, 1) ?? "?"}
                  </span>
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
        </div>
      </div>
      <div
        id="topbar-search-panel"
        ref={searchPanelRef}
        className={`topbar-search-panel${showSearchPanel ? " is-open" : ""}`}
      >
        <div className="topbar-search-panel-inner">
          <form className="topbar-search-form" onSubmit={handleSearchSubmit}>
            <label className="topbar-search-label">
              <span className="sr-only">{t("search.type.label")}</span>
              <select
                value={searchType}
                onChange={(event) =>
                  setSearchType(event.target.value as SearchType)
                }
              >
                <option value="wiki">{t("search.type.wiki")}</option>
                <option value="player">{t("search.type.player")}</option>
              </select>
            </label>
            <input
              type="search"
              value={searchKeyword}
              placeholder={t("search.keyword.placeholder")}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
            <button className="topbar-search-submit" type="submit">
              {t("search.submit")}
            </button>
          </form>
        </div>
      </div>
      <div
        id="topbar-nav-menu"
        ref={navMenuRef}
        className={`topbar-nav-menu${showNavMenu ? " is-open" : ""}`}
      >
        <div className="topbar-nav-menu-inner">
          {navLinks.map((item) => (
            <a
              key={item.labelKey}
              href={item.href}
              className="topbar-link"
              onClick={() => setShowNavMenu(false)}
            >
              {t(item.labelKey)}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Topbar;
