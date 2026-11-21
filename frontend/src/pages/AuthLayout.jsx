// Shared shell for the sign-in and sign-up pages: brand header, page title, and a card around the form.
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';

// Wraps an auth form with the brand mark, a title and subtitle, and a footer note.
// Props: title and subtitle (strings), children (the form), footer (optional node below the card).
export function AuthLayout({ title, subtitle, children, footer }) {
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

      {/* Centered card holding the form */}
      <main className="auth-card">
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </main>

      {footer && <div className="auth-footer">{footer}</div>}
    </div>
  );
}
