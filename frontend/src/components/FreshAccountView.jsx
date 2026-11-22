// Shared helpers for brand-new accounts: loads the signed-in profile from GET /me, decides whether the
// account is fresh (no links yet), and renders an empty dashboard with the account's own name.
import { useEffect, useState } from 'react';
import { Card } from './Card.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

// Responsive grid, same as the Family dashboard's empty view.
const AUTO_GRID = {
  display: 'grid',
  gap: '1.25rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
};

// Per-role intro line and the empty cards shown under it.
const FRESH_VIEWS = {
  elder: {
    message: 'Your family can add you to their care team. Nothing has been added yet.',
    sections: ['Medicines', 'Appointments', 'Caretaker', 'Emergency contacts'],
  },
  family: {
    message: 'You have not added an elder yet. Add the elder you care for to start.',
    sections: ['Medicines', 'Appointments', 'Insurance', 'Family members'],
  },
  volunteer: {
    message: 'No care requests yet. Once a family member links you, your requests will appear here.',
    sections: ['Care requests', 'Help requests', 'Notifications'],
  },
  caretaker: {
    message: 'No assignments yet. A family member can assign you to an elder.',
    sections: ['Assigned elders', 'Medicines', 'Tasks', 'Appointments'],
  },
};

// Loads GET /me once the auth state is known. Signed-out (demo) visitors skip the request,
// because the API answers 401 without a token and the client would send them to /signin.
export function useMyProfile() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, profile: null });
  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setState({ loading: false, profile: null });
      return undefined;
    }
    let cancelled = false;
    api
      .get('/me')
      .then((profile) => {
        if (!cancelled) setState({ loading: false, profile });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, profile: null });
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);
  return { loading: authLoading || state.loading, profile: state.profile };
}

// True when the account has the given role, no elder of its own, and no care links yet.
export function isFreshAccount(profile, role) {
  return Boolean(
    profile?.user?.role === role && !profile.ownElderId && (profile.carelinks?.length ?? 0) === 0,
  );
}

// Empty dashboard for a brand-new account. `name` is the display name (falls back to "there").
export function FreshAccountView({ name, role }) {
  const view = FRESH_VIEWS[role] ?? FRESH_VIEWS.elder;
  const displayName = name || 'there';
  return (
    <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="hero">
        <h1>Welcome, {displayName}</h1>
        <p>{view.message}</p>
      </div>
      <div style={AUTO_GRID}>
        {view.sections.map((section) => (
          <Card key={section} title={section}>
            <p>Nothing added yet.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
