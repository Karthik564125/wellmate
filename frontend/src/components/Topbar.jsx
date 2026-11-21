// Topbar component: patient/role summary, language switcher, role selector, conditional + Add (admin only), and logout.
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { RoleSelect } from './RoleSelect.jsx';
import { useToast } from './ToastProvider.jsx';

// Per-role metadata: name shown in the header, subtitle line, avatar initials and avatar background colour.
// This map keeps all role-specific UI strings in one place so the topbar renders dynamically for every role.
const ROLE_PROFILES = {
  admin: {
    name: 'Admin Console',
    subtitle: 'Platform Administration · Hyderabad Central',
    initials: 'AD',
    bg: '#1d5c73',
  },
  caretaker: {
    name: 'Kavitha Reddy',
    subtitle: 'Care Assistant · Active Shift',
    initials: 'KR',
    bg: '#2f7a57',
  },
  volunteer: {
    name: 'Sandeep Varma',
    subtitle: 'Community Volunteer · Basheerbagh Area',
    initials: 'SV',
    bg: '#b0612b',
  },
  family: {
    name: 'Lakshmi Devi',
    subtitle: 'Family Care Hub · Cared by Meera',
    initials: 'LD',
    bg: '#8a5a7a',
  },
  elder: {
    name: 'Lakshmi Devi',
    subtitle: 'Age 72, lives in Hyderabad',
    initials: 'LD',
    bg: '#8a5a7a',
  },
};

// Topbar: renders the sticky header with the active role's profile, language/role switchers, and admin-only + Add button.
export function Topbar() {
  const { t } = useTranslation();
  const { role, setRole } = useRole();
  const { show } = useToast();
  const navigate = useNavigate();

  // Resolve the active role profile; fall back to elder entry when the role is unknown.
  const profile = ROLE_PROFILES[role] ?? ROLE_PROFILES.elder;

  // Navigate directly to the corresponding dashboard whenever the demo role is switched.
  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    navigate(`/dashboard/${nextRole}`);
  };

  // Quick add demo: only available to admin.
  const handleAdd = () => {
    show('Quick add: invite user, create task, or add an elder record', 'info');
  };

  return (
    <header className="topbar">
      {/* Dynamic profile block: name and subtitle change with the active role */}
      <div className="pt">
        <div
          className="av"
          style={{ background: profile.bg, width: 42, height: 42, fontSize: 15 }}
          aria-label={profile.name}
        >
          {profile.initials}
        </div>
        <div>
          <strong>{profile.name}</strong>
          <small>{profile.subtitle}</small>
        </div>
      </div>

      <div className="sp" />

      {/* Language Switcher: English / Telugu */}
      <LanguageSwitcher />

      {/* Role selector: switching navigates to that role's dashboard */}
      <label className="role">
        {t('dashboard.viewingAs')}{' '}
        <RoleSelect value={role} onChange={handleRoleChange} />
      </label>

      {/* + Add button: restricted to admin role only */}
      {role === 'admin' && (
        <button type="button" className="btn" onClick={handleAdd}>
          + Add
        </button>
      )}

      {/* Logout button */}
      <Link to="/" className="btn g sm" style={{ textDecoration: 'none' }}>
        {t('common.logout')}
      </Link>
    </header>
  );
}
