// Shared shell for the sign-in and sign-up pages: brand header, a photo panel, page title, and a card around the form.
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import './AuthLayout.css';

// Wraps an auth form with the brand mark, a photo, a title and subtitle, and a footer note.
// Props: title and subtitle (strings), image (imported photo URL), imageAlt (descriptive alt text),
// children (the form), footer (optional node below the card).
export function AuthLayout({ title, subtitle, image, imageAlt, children, footer }) {
  // Translation helper for the brand name and footer text.
  const { t } = useTranslation();

  return (
    <div className="auth-page">
      {/* Top bar with brand link and language switch */}
      <header className="auth-header">
        <Link to="/" className="auth-brand">
          <span className="auth-brand__mark" aria-hidden="true">W</span>
          <span>{t('brand.name')}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      {/* Subtle back link to the landing page, on its own row above the card */}
      <Link to="/" className="auth-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        <span>{t('auth.backHome')}</span>
      </Link>


      <div className="auth-body">
        {/* Photo panel: side column on desktop, short banner above the form on mobile */}
        {image && (
          <figure className="auth-photo">
            <img src={image} alt={imageAlt ?? ''} />
          </figure>
        )}

        {/* Centered card holding the form */}
        <main className="auth-card">
          <h1 className="auth-card__title">{title}</h1>
          {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
          {children}
        </main>
      </div>

      {footer && <div className="auth-footer">{footer}</div>}
    </div>
  );
}
