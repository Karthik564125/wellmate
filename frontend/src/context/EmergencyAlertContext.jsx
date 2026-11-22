// Care alert context: holds the one active elder-raised alert (if any) so any
// dashboard can show it the moment it's raised, without a backend round trip.
// Covers both true emergencies (severity "urgent", shown as a blinking red
// banner) and routine asks like "need groceries" (severity "calm", shown as
// a plain, non-blinking banner) - see EmergencyAlertContext usages.
// It also keeps a separate list of medicine requests (medicineRequests) so a
// medicine request is not lost when the single alert is cleared.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// localStorage key so an active alert survives a page refresh until acknowledged.
const STORAGE_KEY = 'wellmate-emergency-alert';

// localStorage key for the list of medicine requests raised via Chitti.
const MEDICINE_REQUESTS_KEY = 'wellmate-medicine-requests';

// Maximum number of medicine requests kept in the list.
const MAX_MEDICINE_REQUESTS = 20;

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

// Read the saved medicine request list, falling back to [] on any parse issue.
function readStoredMedicineRequests() {
  try {
    const saved = window.localStorage.getItem(MEDICINE_REQUESTS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Provides { alert, medicineRequests, triggerAlert({ elderName, medicine, severity, title, message }), clearAlert(), clearMedicineRequest(id) } to the whole app.
export function EmergencyAlertProvider({ children }) {
  const [alert, setAlert] = useState(readStoredAlert);
  const [medicineRequests, setMedicineRequests] = useState(readStoredMedicineRequests);

  // Raise a new alert, replacing any earlier one. severity is "urgent" (red,
  // blinking) or "calm" (plain); title/message are already fully formed text.
  // When a medicine name is given, it is also added to the medicine request list.
  const triggerAlert = useCallback(({ elderName, medicine, severity = 'urgent', title, message }) => {
    const next = { elderName, severity, title, message, triggeredAt: new Date().toISOString() };
    setAlert(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures; the in-memory alert still works.
    }

    if (medicine) {
      const request = { id: String(Date.now()), medicine, elderName, triggeredAt: next.triggeredAt };
      setMedicineRequests((previous) => {
        const updated = [request, ...previous].slice(0, MAX_MEDICINE_REQUESTS);
        try {
          window.localStorage.setItem(MEDICINE_REQUESTS_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage failures; the in-memory list still works.
        }
        return updated;
      });
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

  // Remove one medicine request (for example once it has been marked done).
  const clearMedicineRequest = useCallback((id) => {
    setMedicineRequests((previous) => {
      const updated = previous.filter((item) => item.id !== id);
      try {
        window.localStorage.setItem(MEDICINE_REQUESTS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({ alert, medicineRequests, triggerAlert, clearAlert, clearMedicineRequest }),
    [alert, medicineRequests, triggerAlert, clearAlert, clearMedicineRequest],
  );

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
