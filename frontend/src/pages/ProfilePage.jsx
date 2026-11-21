// Profile and settings page: validated profile form saved to state, language preference and notification switches.
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { FAMILY_MEMBERS } from '../data/mockData.js';

// Simple email shape check: something@something.something with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone check: optional leading plus, then at least eight digits, spaces or dashes.
const PHONE_PATTERN = /^\+?[\d\s-]{8,}$/;

// Starting values for the signed-in user, taken from the first linked family member in the mock data.
const CURRENT_MEMBER = FAMILY_MEMBERS[0];
const INITIAL_PROFILE = {
  name: CURRENT_MEMBER.name,
  email: 'meera.family@example.com',
  phone: CURRENT_MEMBER.phone,
};

// Notification switches shown on the settings tab, with their translation keys.
const NOTIFICATION_ITEMS = [
  { id: 'medicine', titleKey: 'pages.profile.notifMedicine', hintKey: 'pages.profile.notifMedicineHint' },
  { id: 'appointment', titleKey: 'pages.profile.notifAppointment', hintKey: 'pages.profile.notifAppointmentHint' },
  { id: 'help', titleKey: 'pages.profile.notifHelp', hintKey: 'pages.profile.notifHelpHint' },
];

// Profile page with a Profile / Settings tab split, a validated profile form and per-topic notification switches.
export function ProfilePage() {
  // Translation helper and toast trigger.
  const { t } = useTranslation();
  const { show } = useToast();

  // Which tab is showing: profile or settings.
  const [activeTab, setActiveTab] = useState('profile');
  // Profile form values and the validation message for each field.
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [errors, setErrors] = useState({});
  // Notification switch state keyed by item id; all switched on by default.
  const [notifications, setNotifications] = useState({ medicine: true, appointment: true, help: true });

  // Tab definitions for the Tabs component.
  const tabs = [
    { id: 'profile', label: t('pages.profile.tabProfile') },
    { id: 'settings', label: t('pages.profile.tabSettings') },
  ];

  // Update one profile field and clear its error as the user types.
  function handleChange(field, value) {
    setProfile((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  // Validate name, email and phone; on success keep the values in state and confirm with a toast.
  function handleSave(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!profile.name.trim()) nextErrors.name = t('pages.profile.errName');
    if (!EMAIL_PATTERN.test(profile.email.trim())) nextErrors.email = t('pages.profile.errEmail');
    if (!PHONE_PATTERN.test(profile.phone.trim())) nextErrors.phone = t('pages.profile.errPhone');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfile((previous) => ({
      name: previous.name.trim(),
      email: previous.email.trim(),
      phone: previous.phone.trim(),
    }));
    show(t('pages.profile.toastSaved'), 'success');
  }

  // Flip one notification switch and confirm with a toast.
  function toggleNotification(id) {
    setNotifications((previous) => ({ ...previous, [id]: !previous[id] }));
    show(t('pages.profile.toastNotification'), 'info');
  }

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.profileSettings')} subtitle={t('pages.profile.subtitle')} />

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Profile tab: name, email and phone with validation */}
      {activeTab === 'profile' && (
        <Card title={t('pages.profile.detailsTitle')}>
          <form className="stack" onSubmit={handleSave} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="profile-name">
                {t('pages.profile.nameLabel')}
              </label>
              <input
                id="profile-name"
                className="input"
                type="text"
                value={profile.name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => handleChange('name', event.target.value)}
              />
              {errors.name && (
                <span className="field__error" role="alert">
                  {errors.name}
                </span>
              )}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="profile-email">
                {t('pages.profile.emailLabel')}
              </label>
              <input
                id="profile-email"
                className="input"
                type="email"
                value={profile.email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) => handleChange('email', event.target.value)}
              />
              {errors.email && (
                <span className="field__error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="profile-phone">
                {t('pages.profile.phoneLabel')}
              </label>
              <input
                id="profile-phone"
                className="input"
                type="tel"
                value={profile.phone}
                aria-invalid={Boolean(errors.phone)}
                onChange={(event) => handleChange('phone', event.target.value)}
              />
              {errors.phone && (
                <span className="field__error" role="alert">
                  {errors.phone}
                </span>
              )}
            </div>
            <div>
              <button type="submit" className="btn btn-primary">
                {t('pages.profile.saveProfile')}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Settings tab: language preference and notification switches */}
      {activeTab === 'settings' && (
        <div className="stack">
          <Card title={t('pages.profile.languageTitle')}>
            <div className="stack">
              <p className="section-header__subtitle">{t('pages.profile.languageHint')}</p>
              <LanguageSwitcher />
            </div>
          </Card>

          <Card title={t('pages.profile.notificationsTitle')}>
            <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {NOTIFICATION_ITEMS.map((item) => {
                const on = Boolean(notifications[item.id]);
                return (
                  <li key={item.id} className="row row--between">
                    <div>
                      <strong>{t(item.titleKey)}</strong>
                      <p className="section-header__subtitle">{t(item.hintKey)}</p>
                    </div>
                    {/* Switch: aria-checked carries the on/off state for assistive technology */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      className={`btn btn-sm ${on ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleNotification(item.id)}
                    >
                      {on ? t('pages.profile.on') : t('pages.profile.off')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
