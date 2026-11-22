// Public landing page: hero, feature cards with icons, 1-click role demo access, and healthcare disclaimer.
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { ROLES } from '../data/mockData.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import wellmateLogo from '../assets/wellmate.jpeg';
import wellmateIcon from '../assets/wellmate-icon.jpeg';

// Feature keys shown as cards; each maps to landing.features.<key>.title and landing.features.<key>.description in translations.
const FEATURE_KEYS = ['roleDashboards', 'medicineReminders', 'appointments', 'cabBooking', 'insurance', 'volunteerHelp'];

// Feature SVG icon component based on key name.
function FeatureIcon({ name }) {
  switch (name) {
    case 'roleDashboards':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--primary)' }} aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'medicineReminders':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--primary)' }} aria-hidden="true">
          <path d="M8 4l12 12a4 4 0 01-6 6L2 10a4 4 0 016-6zM9 11l5 5" />
        </svg>
      );
    case 'appointments':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--primary)' }} aria-hidden="true">
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
        </svg>
      );
    case 'cabBooking':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--primary)' }} aria-hidden="true">
          <path d="M5 17h14M5 12h14M7 8l2-4h6l2 4" />
          <rect x="3" y="8" width="18" height="10" rx="2" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="17" cy="15" r="1.5" />
        </svg>
      );
    case 'insurance':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--primary)' }} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'volunteerHelp':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--primary)' }} aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
  }
}

// Landing page view rendering header, hero, features grid, role switcher, and healthcare footer.
export function LandingPage() {
  const { t } = useTranslation();
  const { setRole } = useRole();

  return (
    <div className="landing">
      {/* Header with brand and auth links */}
      <header className="landing-header">
        <Link to="/" className="auth-brand">
          <img className="brand-logo-icon" src={wellmateIcon} alt="" aria-hidden="true" />
          <span>{t('brand.name')}</span>
        </Link>

        {/* Header navigation: language switcher and sign-in / sign-up links */}
        <nav className="landing-header__nav" aria-label={t('common.menu')}>
          <LanguageSwitcher />
          <Link to="/signin" className="btn btn-ghost">{t('auth.signIn')}</Link>
          <Link to="/signup" className="btn btn-primary">{t('auth.signUp')}</Link>
        </nav>
      </header>

      {/* Hero section with headline, subtitle and calls to action */}
      <section className="landing-hero">
        <div className="hero-split">
          <div className="hero-split__media">
            <img className="brand-logo-full" src={wellmateLogo} alt="Wellmate" />
          </div>
          <div className="hero-split__copy">
            <div className="landing-hero__tagline">{t('brand.tagline')}</div>
            <h1>{t('landing.heroTitle')}</h1>
            <p className="landing-hero__subtitle">{t('landing.heroSubtitle')}</p>
            <div className="landing-hero__actions">
              <Link to="/signup" className="btn btn-primary btn-lg">{t('landing.ctaSignUp')}</Link>
              <Link to="/signin" className="btn btn-secondary btn-lg">{t('landing.ctaSignIn')}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="landing-section">
        <h2>{t('landing.featuresTitle')}</h2>
        <div className="landing-grid">
          {FEATURE_KEYS.map((key) => (
            <article key={key} className="landing-card">
              <div style={{ marginBottom: 4 }}>
                <FeatureIcon name={key} />
              </div>
              <h3>{t(`landing.features.${key}.title`)}</h3>
              <p>{t(`landing.features.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Roles overview, one card per role from the mock role list */}
      <section className="landing-section">
        <h2>{t('landing.rolesTitle')}</h2>
        <p className="landing-section__subtitle">{t('landing.rolesSubtitle')}</p>
        <div className="landing-grid">
          {ROLES.map((item) => (
            <article key={item.id} className="landing-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>{t(item.labelKey)}</h3>
                <span className="pill info" style={{ fontSize: 11 }}>Demo</span>
              </div>
              <p style={{ margin: '8px 0 16px' }}>
                Explore specialized elderly care tools tailored for the {t(item.labelKey)} workflow.
              </p>
              <Link
                to={`/dashboard/${item.id}`}
                className="btn btn-secondary btn-sm"
                onClick={() => setRole(item.id)}
              >
                {t('landing.ctaSignIn')} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Subscription plans: sample tiers for the demo, pricing not yet confirmed */}
      <section className="landing-section">
        <h2>Plans</h2>
        <p className="landing-section__subtitle">Sample plans for the demo.</p>

        <div className="plan-grid">
          <article className="plan-card">
            <h3 className="plan-card__name">Free</h3>
            <p className="plan-card__desc">Get started with one elder.</p>
            <div className="plan-card__price">0</div>
            <ul className="plan-card__list">
              <li>Basic family care hub</li>
              <li>Shared appointments and medicine timeline</li>
              <li>1 elder profile</li>
            </ul>
            <button type="button" className="btn btn-secondary btn--block">Choose Free</button>
          </article>
          <article className="plan-card plan-card--featured">
            <span className="plan-card__tag">Most popular</span>
            <h3 className="plan-card__name">Pro</h3>
            <p className="plan-card__desc">Help and reminders for active families.</p>
            <div className="plan-card__price">5000</div>
            <ul className="plan-card__list">
              <li>Everything in Free</li>
              <li>Help requests and volunteer matching</li>
              <li>Reminders and refill tracker</li>
              <li>Up to 5 elder profiles</li>
            </ul>
            <button type="button" className="btn btn--primary btn--block">Choose Pro</button>
          </article>
          <article className="plan-card">
            <h3 className="plan-card__name">Pro Max</h3>
            <p className="plan-card__desc">Full access for larger care teams.</p>
            <div className="plan-card__price">10000</div>
            <ul className="plan-card__list">
              <li>Everything in Pro</li>
              <li>Role-based access for all family members</li>
              <li>Care-team and insurance tools</li>
              <li>Unlimited elder profiles</li>
            </ul>
            <button type="button" className="btn btn--primary btn--block">Choose Pro Max</button>
          </article>
        </div>
      </section>


      {/* Footer with the medical disclaimer */}
      <footer className="landing-footer">
        <p>{t('landing.footerNote')}</p>
      </footer>
    </div>
  );
}
