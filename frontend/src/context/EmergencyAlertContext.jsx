// Care alert context: holds the one active elder-raised alert (if any) so any
// dashboard can show it the moment it's raised, without a backend round trip.
// Covers both true emergencies (severity "urgent", shown as a blinking red
// banner) and routine asks like "need groceries" (severity "calm", shown as
// a plain, non-blinking banner) - see EmergencyAlertContext usages.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// localStorage key so an active alert survives a page refresh until acknowledged.
const STORAGE_KEY = 'wellmate-emergency-alert';

const EmergencyAlertContext = createContext(null);

// Read a previously saved alert, if any, falling back to null on any parse issue.
function readStoredAlert() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

// Provides { alert, triggerAlert({ elderName, severity, title, message }), clearAlert() } to the whole app.
export function EmergencyAlertProvider({ children }) {
  const [alert, setAlert] = useState(readStoredAlert);

  // Raise a new alert, replacing any earlier one. severity is "urgent" (red,
  // blinking) or "calm" (plain); title/message are already fully formed text.
  const triggerAlert = useCallback(({ elderName, severity = 'urgent', title, message }) => {
    const next = { elderName, severity, title, message, triggeredAt: new Date().toISOString() };
    setAlert(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures; the in-memory alert still works.
    }
  }, []);

  // Acknowledge/clear the active alert.
  const clearAlert = useCallback(() => {
    setAlert(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo(() => ({ alert, triggerAlert, clearAlert }), [alert, triggerAlert, clearAlert]);

  return <EmergencyAlertContext.Provider value={value}>{children}</EmergencyAlertContext.Provider>;
}

// Hook returning { alert, triggerAlert, clearAlert } for use inside components.
export function useEmergencyAlert() {
  const ctx = useContext(EmergencyAlertContext);
  if (!ctx) {
    throw new Error('useEmergencyAlert must be used inside an EmergencyAlertProvider');
  }
  return ctx;
}
