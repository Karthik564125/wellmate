// Sidebar navigation: fixed left navigation matching family-care-hub.html with SVG icons, active on-state, and medical disclaimer footnote.
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Vector SVG icon renderer matching family-care-hub.html icon shapes.
function NavIcon({ name }) {
  switch (name) {
    case 'home':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11l9-8 9 8M5 10v10h14V10" />
        </svg>
      );
    case 'pill':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4l12 12a4 4 0 01-6 6L2 10a4 4 0 016-6zM9 11l5 5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
        </svg>
      );
    case 'alert':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case 'user':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'team':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 11a3 3 0 100-6M8 11a3 3 0 100-6M2 20c0-3 3-5 6-5s6 2 6 5M16 15c3 0 6 2 6 5" />
        </svg>
      );
    case 'cab':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 17h14M5 12h14M7 8l2-4h6l2 4" />
          <rect x="3" y="8" width="18" height="10" rx="2" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="17" cy="15" r="1.5" />
        </svg>
      );
    case 'shield':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'help':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    case 'grid':
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'clock':
    default:
      return (
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

// Sidebar component: fixed aside element with brand logo, links, and medical footer.
export function Sidebar({ links = [], onNavigate }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer when navigating.
  function handleNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <>
      {/* Mobile drawer toggle */}
      <button
        type="button"
        className="sidebar-toggle"
        aria-expanded={open}
        aria-controls="nav"
        aria-label={t('common.menu')}
        onClick={() => setOpen((prev) => !prev)}
      >
        ☰
      </button>

      {/* Main sticky aside matching family-care-hub.html */}
      <aside id="nav" className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Main">
        {/* Logo matching family-care-hub.html */}
        <div className="logo">
          <i>
            <svg className="i" viewBox="0 0 24 24" style={{ stroke: '#14313d' }} aria-hidden="true">
              <path d="M16 11a3 3 0 100-6M8 11a3 3 0 100-6M2 20c0-3 3-5 6-5s6 2 6 5M16 15c3 0 6 2 6 5" />
            </svg>
          </i>
          <span>WellMate</span>
        </div>

        {/* Navigation links with exact 'on' active class */}
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'on is-active' : '')}
            onClick={handleNavigate}
          >
            <NavIcon name={link.icon} />
            <span>{t(link.labelKey)}</span>
            {link.icon === 'alert' && <b>!</b>}
          </NavLink>
        ))}

        {/* Footer disclaimer matching family-care-hub.html */}
        <div className="side-foot">
          Organises information only. It does not give medical advice. Doctors make all clinical decisions. Sample data.
        </div>
      </aside>

      {/* Scrim for mobile view */}
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}
