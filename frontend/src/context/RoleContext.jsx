// Role context: holds the active demo role (admin | caretaker | family | elder | volunteer) for the whole app.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Roles the app understands; anything else is rejected.
const VALID_ROLES = ['admin', 'caretaker', 'family', 'elder', 'volunteer'];

// Role used when nothing valid has been chosen yet.
const DEFAULT_ROLE = 'family';

// localStorage key where the chosen demo role is saved between visits.
const STORAGE_KEY = 'wellmate-role';

// Context carrying { role, setRole } down the tree.
const RoleContext = createContext(null);

// Read the saved role from localStorage, falling back to the default if it is missing or invalid.
function readStoredRole() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return VALID_ROLES.includes(saved) ? saved : DEFAULT_ROLE;
  } catch {
    // localStorage can be unavailable (e.g. privacy mode); use the default role.
    return DEFAULT_ROLE;
  }
}

// Provides the active role and a setter that persists it.
export function RoleProvider({ children }) {
  // Current role, initialised from localStorage.
  const [role, setRoleState] = useState(readStoredRole);

  // Update the role; ignores unsupported values and saves valid ones.
  const setRole = useCallback((next) => {
    if (!VALID_ROLES.includes(next)) return;
    setRoleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the in-memory role still works.
    }
  }, []);

  // Memoise the context value so consumers only re-render when the role changes.
  const value = useMemo(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// Hook returning { role, setRole } for use inside components.
export function useRole() {
  // Read the nearest provider's value.
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used inside a RoleProvider');
  }
  return ctx;
}
