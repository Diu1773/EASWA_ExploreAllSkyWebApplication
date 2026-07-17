import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useT, useLangStore } from '../../i18n';

interface NavLinkItem {
  to: string;
  label: string;
  active: boolean;
}

function LogoIcon() {
  return (
    <svg
      className="navbar-logo"
      width="28"
      height="28"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="44" stroke="#ff6600" strokeWidth="3" opacity="0.9" />
      <ellipse cx="50" cy="50" rx="44" ry="16" stroke="#ff8533" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="50" cy="50" rx="16" ry="44" stroke="#ff8533" strokeWidth="1.5" opacity="0.3" />
      <circle cx="50" cy="50" r="4" fill="#ff6600" />
      <circle cx="50" cy="50" r="8" fill="#ff6600" opacity="0.2" />
      <circle cx="30" cy="35" r="2.5" fill="#ffa366" />
      <circle cx="72" cy="42" r="2.5" fill="#ffa366" />
      <circle cx="58" cy="70" r="2.5" fill="#ffa366" />
      <circle cx="38" cy="60" r="2" fill="#ffa366" opacity="0.6" />
    </svg>
  );
}

export function Navbar() {
  const location = useLocation();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const toggleLang = useLangStore((s) => s.toggleLang);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Home only. The "Explorer" entry used to point at the standalone sky page
  // (/explorer), which sits outside the inquiry block — a learner who clicked it
  // mid-analysis landed on the legacy map with no way back into their steps.
  // Home carries the module cards, which is the intended way in.
  const navLinks: NavLinkItem[] = [
    { to: '/', label: t('nav.home'), active: location.pathname === '/' },
  ];

  // Close menus when clicking outside
  useEffect(() => {
    if (!menuOpen && !mobileNavOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, mobileNavOpen]);

  return (
    <nav className={`navbar ${mobileNavOpen ? 'mobile-open' : ''}`} ref={navRef}>
      <Link
        to="/"
        className="navbar-brand"
        onClick={() => {
          setMenuOpen(false);
          setMobileNavOpen(false);
        }}
      >
        <LogoIcon />
        <div className="navbar-brand-copy">
          <span className="navbar-title">EASWA</span>
          <span className="navbar-subtitle">Exploring All-Sky Web Application</span>
        </div>
      </Link>

      <button
        type="button"
        className={`navbar-menu-toggle ${mobileNavOpen ? 'open' : ''}`}
        onClick={() => setMobileNavOpen((prev) => !prev)}
        aria-label={t('nav.menuLabel')}
        aria-expanded={mobileNavOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="navbar-links">
        {navLinks.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={item.active ? 'active' : ''}
            onClick={() => setMobileNavOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="navbar-lang-toggle"
        onClick={toggleLang}
        title={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}
      >
        {lang === 'ko' ? 'EN' : 'KO'}
      </button>
      <div className="navbar-auth">
        {loading ? null : user ? (
          <>
            <button
              className="navbar-avatar-button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={lang === 'ko' ? '사용자 메뉴' : 'User menu'}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="navbar-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="navbar-avatar-fallback">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {menuOpen && (
              <div className="user-menu">
                <div className="user-menu-header">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt=""
                      className="user-menu-avatar"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="user-menu-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
                <div className="user-menu-divider" />
                <Link
                  to="/my"
                  className={`user-menu-item${location.pathname === '/my' ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  {t('nav.myAnalyses')}
                </Link>
                <Link
                  to="/settings"
                  className={`user-menu-item${location.pathname === '/settings' ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  {t('nav.settings')}
                </Link>
                {user.is_admin && (
                  <Link
                    to="/admin"
                    className={`user-menu-item${location.pathname === '/admin' ? ' active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M8 17V9" />
                      <path d="M12 17V7" />
                      <path d="M16 17v-5" />
                    </svg>
                    {lang === 'ko' ? '관리자' : 'Admin'}
                  </Link>
                )}
                <div className="user-menu-divider" />
                <button className="user-menu-item danger" onClick={logout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {t('nav.signOut')}
                </button>
              </div>
            )}
          </>
        ) : (
          <a href="/api/auth/login" className="btn-sm navbar-login">
            <span className="navbar-login-label">{lang === 'ko' ? '로그인' : 'Sign in'}</span>
            <span className="navbar-login-provider">{lang === 'ko' ? 'Google 계정' : 'with Google'}</span>
          </a>
        )}
      </div>
    </nav>
  );
}
