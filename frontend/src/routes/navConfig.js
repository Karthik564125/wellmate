// Sidebar navigation per role; labelKey values point at existing nav.* keys in translations.js.

// Links shown in the sidebar for each role id.
export const NAV_BY_ROLE = {
  elder: [
    { to: '/dashboard/elder', labelKey: 'nav.today', icon: 'home' },
    { to: '/medicines', labelKey: 'nav.medicines', icon: 'pill' },
    { to: '/appointments', labelKey: 'nav.appointments', icon: 'calendar' },
    { to: '/dashboard/elder#emergency', labelKey: 'nav.emergency', icon: 'alert' },
    { to: '/profile', labelKey: 'nav.profileSettings', icon: 'user' },
  ],
  family: [
    { to: '/dashboard/family', labelKey: 'nav.overview', icon: 'home' },
    { to: '/medicines', labelKey: 'nav.medicines', icon: 'pill' },
    { to: '/appointments', labelKey: 'nav.appointments', icon: 'calendar' },
    { to: '/care-team', labelKey: 'nav.careTeam', icon: 'team' },
    { to: '/cab', labelKey: 'nav.cabTransport', icon: 'cab' },
    { to: '/insurance', labelKey: 'nav.insurance', icon: 'shield' },
    { to: '/dashboard/volunteer', labelKey: 'nav.helpRequests', icon: 'help' },
    { to: '/profile', labelKey: 'nav.profileSettings', icon: 'user' },
  ],
  caretaker: [
    { to: '/dashboard/caretaker', labelKey: 'nav.dashboard', icon: 'grid' },
    { to: '/medicines', labelKey: 'nav.medicines', icon: 'pill' },
    { to: '/appointments', labelKey: 'nav.appointments', icon: 'calendar' },
    { to: '/care-team', labelKey: 'nav.careTeam', icon: 'team' },
    { to: '/profile', labelKey: 'nav.profileSettings', icon: 'user' },
  ],
  volunteer: [
    { to: '/dashboard/volunteer', labelKey: 'nav.dashboard', icon: 'grid' },
    { to: '/dashboard/volunteer#requests', labelKey: 'nav.helpRequests', icon: 'help' },
    { to: '/dashboard/volunteer#elders', labelKey: 'nav.elders', icon: 'user' },
    { to: '/profile', labelKey: 'nav.profileSettings', icon: 'user' },
  ],
  admin: [
    { to: '/dashboard/admin', labelKey: 'nav.dashboard', icon: 'grid' },
    { to: '/care-team', labelKey: 'nav.usersAssignments', icon: 'team' },
    { to: '/appointments', labelKey: 'nav.appointments', icon: 'calendar' },
    { to: '/cab', labelKey: 'nav.cabTransport', icon: 'cab' },
    { to: '/insurance', labelKey: 'nav.insurance', icon: 'shield' },
    { to: '/profile', labelKey: 'nav.profileSettings', icon: 'user' },
  ],
};
