// Topbar component: patient/role summary, language switcher, role selector, conditional + Add (admin only), and logout.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import { useRole } from '../context/RoleContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { RoleSelect } from './RoleSelect.jsx';
import { useToast } from './ToastProvider.jsx';

// Two letters to show in the avatar circle for a real account's own name
// (demo roles use a fixed ROLE_PROFILES.initials instead - see below).
function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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
    name: 'Ramakrishna',
    subtitle: 'WellMate · GrandSon of Lakshmi Devi',
    initials: 'RA',
    bg: '#3a6ea5',
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
  const { user, loading: authLoading, signOutUser } = useAuth();

  // No real signed-in account: this is demo mode, same check as every other demo-aware screen.
  const demoMode = !authLoading && !user;

  // Real account: fetch the signed-in user's own name/role from the backend,
  // instead of showing one of the fixed demo personas below.
  const [realUser, setRealUser] = useState(null);
  useEffect(() => {
    if (demoMode || !user) {
      setRealUser(null);
      return;
    }
    let cancelled = false;
    api
      .get('/me')
      .then((me) => {
        if (!cancelled) setRealUser(me.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [demoMode, user]);

  // Resolve the active profile: the real signed-in account's own name/role
  // once loaded, otherwise the demo persona for the active role.
  const profile =
    !demoMode && realUser
      ? {
          name: realUser.name,
          subtitle: `WellMate · ${t(`roles.${realUser.role}`)}`,
          initials: getInitials(realUser.name),
          bg: '#3a6ea5',
        }
      : (ROLE_PROFILES[role] ?? ROLE_PROFILES.elder);

  // Demo mode just navigates home (there's no real session to end); a real
  // account also actually signs out of Firebase, not just navigates away.
  function handleLogout() {
    if (!demoMode) signOutUser().catch(() => {});
    navigate('/');
  }

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
      <button type="button" className="btn g sm" onClick={handleLogout}>
        {t('common.logout')}
      </button>
    </header>
  );
}
