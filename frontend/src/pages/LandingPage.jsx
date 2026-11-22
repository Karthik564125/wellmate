// Public landing page: hero, feature highlights, plans, stats, testimonials and the medical disclaimer footer.
import './LandingPage.css';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import wellmateIcon from '../assets/wellmate-icon.jpeg';
import heroImg from '../assets/1.png';
import promiseImg from '../assets/2.png';
import aboutImg from '../assets/3.png';
import medicineImg from '../assets/5.png';
import appointmentImg from '../assets/10.png';
import chittiImg from '../assets/9.png';
import personalCareImg from '../assets/6.png';
import familyImg from '../assets/11.png';
import wellnessImg from '../assets/12.png';
import mobilityImg from '../assets/8.png';

// Small line icons used across the page. Each name maps to a path set; all share one stroke style.
function Icon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };
  switch (name) {
    case 'pill':
      return (
        <svg {...common}>
          <path d="M8 4l12 12a4 4 0 01-6 6L2 10a4 4 0 016-6zM9 11l5 5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
        </svg>
      );
    case 'voice':
      return (
        <svg {...common}>
          <path d="M4 12v0M8 9v6M12 5v14M16 8v8M20 11v2" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M21.5 20c-.5-2.4-2-4.2-4.2-5" />
        </svg>
      );
    case 'arrow':
    default:
      return (
        <svg {...common} className="lp-arrow">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
  }
}

const HIGHLIGHTS = [
  { icon: 'pill', label: 'Medicine reminders on time' },
  { icon: 'calendar', label: 'Appointments in one place' },
];

const CARDS = [
  { icon: 'pill', image: medicineImg, alt: 'Medicine reminder for an elderly person', title: 'Medicine reminders', text: 'Timely dose alerts shared across the whole family so nothing gets missed.', link: 'Set reminders' },
  { icon: 'calendar', image: appointmentImg, alt: 'Elderly patient attending an online doctor consultation', title: 'Appointments', text: 'Doctor visits, checkups and follow-ups kept in one shared calendar.', link: 'View appointments' },
  { icon: 'voice', image: chittiImg, alt: 'Chitti voice assistant helping an elderly person', title: 'Chitti voice help', text: 'A friendly voice assistant that checks in with elders and answers simple questions.', link: 'Meet Chitti' },
];

// Daily care highlights: alternating image and text rows. tKey is the landingPage.* translation key stem.
const CARE_ROWS = [
  { tKey: 'personalisedCare', image: personalCareImg, alt: 'Caregiver checking an elderly person\'s blood pressure' },
  { tKey: 'familyInvolvement', image: familyImg, alt: 'Family gathered together supporting an elderly relative' },
  { tKey: 'wellnessCompanionship', image: wellnessImg, alt: 'Elderly couple enjoying a relaxed day together' },
  { tKey: 'mobilitySupport', image: mobilityImg, alt: 'Elderly person walking with gentle support' },
];

// How it works: three numbered steps. tKey stems map to landingPage.step{N}Title / step{N}Text.
const STEPS = [
  { num: '1', tKey: 'step1' },
  { num: '2', tKey: 'step2' },
  { num: '3', tKey: 'step3' },
];

// Pricing content. Prices and Pro Max features are the approved plan values.
const PLANS = [
  {
    key: 'free',
    tKey: 'planFree',
    tone: 'lime',
    price: '₹0',
    items: ['Basic family care hub', 'Shared appointments and medicine timeline', '1 elder profile'],
    cta: 'Choose Free',
  },
  {
    key: 'pro',
    tKey: 'planPro',
    tone: 'cream',
    price: '₹199',
    items: ['Everything in Free', 'Help requests and volunteer matching', 'Reminders and refill tracker', 'Up to 5 elder profiles'],
    cta: 'Choose Pro',
  },
  {
    key: 'max',
    tKey: 'planProMax',
    tone: 'blue',
    price: '₹299',
    items: [
      'Everything in Pro',
      'Role-based access for all family members',
      'Care-team and insurance tools',
      'Chitti Voice on Wake-up',
      'Emergency Assistance',
      'Power Model',
    ],
    cta: 'Choose Pro Max',
  },
];

const TESTIMONIALS = [
  { tone: 'pink', quote: 'Medicine reminders arrive right on time, and my father finally has a routine we can all see.', name: 'Sample: Asha R.', role: 'Daughter, sample testimonial' },
  { tone: 'lime', quote: 'Booking checkups used to be a scramble. Now every appointment sits in one shared calendar.', name: 'Sample: Vikram S.', role: 'Son, sample testimonial' },
  { tone: 'blue', quote: 'Chitti greets my mother every morning. It gives both of us peace of mind.', name: 'Sample: Lakshmi P.', role: 'Caregiver, sample testimonial' },
];

// Landing page view with navigation, hero, highlights, feature cards, plans, stats, testimonials and footer.
export function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="lp">
      {/* Top navigation */}
      <header className="lp-nav">
        <Link to="/" className="lp-brand">
          <img className="lp-brand__icon" src={wellmateIcon} alt="" aria-hidden="true" />
          <span>{t('brand.name')}</span>
        </Link>
        <nav className="lp-nav__links" aria-label={t('landingPage.nav.main')}>
          <a href="#features">{t('landingPage.nav.features')}</a>
          <a href="#plans">{t('landingPage.nav.plans')}</a>
        </nav>
        <div className="lp-nav__right">
          <LanguageSwitcher />
          <div className="lp-nav__auth">
            <Link to="/signin" className="lp-pill lp-pill--outline lp-pill--small">{t('auth.signIn')}</Link>
            <Link to="/signup" className="lp-pill lp-pill--plum lp-pill--small">{t('nav.register')} <Icon name="arrow" /></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div>
          <h1 className="lp-serif">
            {t('landingPage.heroTitle')}
          </h1>
          <p className="lp-hero__sub">
            {t('landingPage.heroText')}
          </p>
          <div className="lp-hero__actions">
            <a href="#plans" className="lp-pill lp-pill--plum">{t('landingPage.exploreMore')} <Icon name="arrow" /></a>
            <a href="#features" className="lp-circle-btn">{t('landingPage.watchVideos')}</a>
          </div>
        </div>
        <div className="lp-hero__visual lp-media">
          <img src={heroImg} alt="Elderly couple smiling together at home" />
        </div>
      </section>

      {/* Unlock your potential */}
      <section className="lp-section lp-section--white">
        <div className="lp-grid-2">
          <div>
            <span className="lp-eyebrow">{t('landingPage.ourPromise')}</span>
            <h2 className="lp-serif">{t('landingPage.unlockPotential')}</h2>
            <div className="lp-rows">
              {HIGHLIGHTS.map((item) => (
                <div key={item.label} className="lp-row">
                  <span className="lp-row__icon"><Icon name={item.icon} /></span>
                  <span className="lp-row__label">{item.label}</span>
                  <span className="lp-row__arrow"><Icon name="arrow" /></span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-media">
            <img src={promiseImg} alt="Doctor consulting with an elderly patient" />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="lp-section">
        <div className="lp-grid-2 lp-about">
          <div className="lp-media">
            <img src={aboutImg} alt="Caregiver assisting an elderly woman" />
          </div>
          <div>
            <div className="lp-about__label">About</div>
            <h2 className="lp-serif">{t('landingPage.aboutTitle')}</h2>
            <p>
              {t('landingPage.aboutText')}
            </p>
          </div>
        </div>
      </section>

      {/* How it works: three steps and a trust strip */}
      <section className="lp-section lp-section--white">
        <div className="lp-section--center">
          <span className="lp-eyebrow">{t('landingPage.howEyebrow')}</span>
          <h2 className="lp-serif">{t('landingPage.howTitle')}</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((step) => (
            <article key={step.num} className="lp-step">
              <div className="lp-step__num">{step.num}</div>
              <h3>{t(`landingPage.${step.tKey}Title`)}</h3>
              <p>{t(`landingPage.${step.tKey}Text`)}</p>
            </article>
          ))}
        </div>
        <div className="lp-trust">
          <span>{t('landingPage.trustPrivacy')}</span>
          <span>{t('landingPage.trustLanguage')}</span>
          <span>{t('landingPage.trustCaregivers')}</span>
        </div>
      </section>

      {/* Refined living experience: feature cards */}
      <section className="lp-section lp-section--center" id="features">
        <span className="lp-eyebrow">{t('landingPage.healthyLiving')}</span>
        <h2 className="lp-serif">{t('landingPage.refinedLiving')}</h2>
        <div className="lp-cards-3">
          {CARDS.map((card) => (
            <article key={card.title} className="lp-card">
              <div className="lp-card__media lp-media">
                <img src={card.image} alt={card.alt} />
              </div>
              <span className="lp-card__icon"><Icon name={card.icon} /></span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <span className="lp-card__link">{card.link} <Icon name="arrow" /></span>
            </article>
          ))}
        </div>
      </section>

      {/* Daily care highlights: alternating image and text rows */}
      <section className="lp-section">
        <div className="lp-care">
          <div className="lp-section--center">
            <span className="lp-eyebrow">{t('landingPage.dailyCare')}</span>
            <h2 className="lp-serif">{t('landingPage.dailyCareTitle')}</h2>
          </div>
          {CARE_ROWS.map((row, index) => (
            <div key={row.tKey} className={`lp-care-row${index % 2 === 1 ? ' lp-care-row--reverse' : ''}`}>
              <div className="lp-media">
                <img src={row.image} alt={row.alt} />
              </div>
              <div>
                <h3 className="lp-serif lp-care-row__title">{t(`landingPage.${row.tKey}`)}</h3>
                <p className="lp-care-row__text">{t(`landingPage.${row.tKey}Text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="lp-section lp-section--center lp-section--white" id="plans">
        <span className="lp-eyebrow">{t('landingPage.plans')}</span>
        <h2 className="lp-serif">{t('landingPage.findPlan')}</h2>
        <div className="lp-plans">
          {PLANS.map((plan) => (
            <article key={plan.key} className={`lp-plan lp-plan--${plan.tone}`} style={{ textAlign: 'left' }}>
              <h3 className="lp-plan__name">{t(`landingPage.${plan.tKey}Name`)}</h3>
              <p className="lp-plan__desc">{t(`landingPage.${plan.tKey}Desc`)}</p>
              <div className="lp-plan__price">
                {plan.price}
                {plan.key !== 'free' && <small>{t('landingPage.perMonth')}</small>}
              </div>
              <ul className="lp-plan__list">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/signup" className="lp-pill lp-pill--plum">{plan.cta}</Link>
            </article>
          ))}
          <article className="lp-plan lp-plan--pink" style={{ textAlign: 'left' }}>
            <h3 className="lp-plan__name">{t('landingPage.helpingHand')}</h3>
            <p className="lp-plan__desc">{t('landingPage.volunteerText')}</p>
            <ul className="lp-plan__list">
              <li>Visit and check in on elders</li>
              <li>Pick up medicines or join appointments</li>
            </ul>
            <Link to="/signup" className="lp-plan__link">{t('landing.volunteer')} <Icon name="arrow" /></Link>
          </article>
        </div>
      </section>

      {/* Stats band: numbers are labelled as samples, not claims */}
      <section className="lp-stats">
        <div className="lp-stats__inner">
          <div>
            <h2 className="lp-serif">{t('landingPage.helpingPotential')}</h2>
            <div className="lp-stats__numbers">
              <div>
                <div className="lp-stats__num">1,500+</div>
                <div className="lp-stats__label">{t('landingPage.sampleFamilies')}</div>
              </div>
              <div>
                <div className="lp-stats__num">60+</div>
                <div className="lp-stats__label">{t('landingPage.sampleVolunteers')}</div>
              </div>
            </div>
          </div>
          <div className="lp-stats__cta">
            <span className="lp-pill lp-pill--light">
              <Icon name="heart" /> {t('landingPage.healthCare')}
            </span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-section">
        <div className="lp-testimonials">
          <div className="lp-testimonials__head">
            <h2 className="lp-serif">{t('landingPage.clientsTitle')}</h2>
            <a href="#features" className="lp-pill lp-pill--outline lp-pill--small">{t('landing.seeAll')} <Icon name="arrow" /></a>
          </div>
          <div className="lp-testimonials__grid">
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className={`lp-quote lp-quote--${item.tone}`} style={{ margin: 0 }}>
                <p className="lp-quote__text">&ldquo;{item.quote}&rdquo;</p>
                <figcaption>
                  <div className="lp-quote__who">{item.name}</div>
                  <div className="lp-quote__role">{item.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Footer with the medical disclaimer */}
      <footer className="lp-footer">
        <span className="lp-footer__brand">{t('brand.name')}</span>
        <span className="lp-footer__accent" aria-hidden="true" />
        <p>{t('landing.footerNote')}</p>
      </footer>
    </div>
  );
}
