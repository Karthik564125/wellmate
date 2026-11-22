// Floating Chitti launcher: a persistent chat-bot bubble shown on every
// signed-in page (added once in AppLayout), so Chitti is reachable from
// anywhere, not buried in a single dashboard's nav. Hidden on the Chitti
// page itself, since you're already there.
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export function ChittiLauncher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.startsWith('/chitti')) return null;

  return (
    <button
      type="button"
      className="chitti-launcher"
      onClick={() => navigate('/chitti')}
      aria-label={t('chitti.launcherLabel')}
    >
      <svg className="chitti-launcher__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12c0 4.42-4.03 8-9 8-1.18 0-2.3-.2-3.33-.57L4 21l1.3-3.9C4.47 15.96 4 14.53 4 13c0-4.42 4.03-8 9-8s8 3.58 8 7z" />
        <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
      <span className="chitti-launcher__label">{t('chitti.launcherLabel')}</span>
    </button>
  );
}
