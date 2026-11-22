// Care request context: holds small neighbourhood help requests (e.g. "needs sugar
// tablets") that a volunteer can respond to as available/not available. The response
// is shared app-wide so it shows up on the elder's and family's dashboards too,
// without a backend round trip - same pattern as EmergencyAlertContext.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// localStorage key so responses survive a page refresh.
const STORAGE_KEY = 'wellmate-care-requests';

const CareRequestContext = createContext(null);

// Seed data: open requests near the demo elders, waiting for a volunteer response.
// actionText completes "{volunteer} is/is not available to {actionText}" on the banners.
const SEED_REQUESTS = [
  {
    id: 'care-sugar',
    title: 'Medicine needed',
    elderName: 'Savitramma',
    item: 'sugar tablets',
    actionText: 'bring sugar tablets for Savitramma',
    question: 'Savitramma needs sugar tablets. Are you available to help?',
    status: 'open', // 'open' | 'responded'
    volunteerName: null,
    response: null, // 'available' | 'not-available'
    respondedAt: null,
  },
  {
    id: 'care-hospital-trip',
    title: 'Service needed',
    elderName: 'Lakshmi Devi',
    item: 'hospital visit',
    actionText: 'take Lakshmi Devi to the hospital, a 20 km trip',
    question: 'Lakshmi Devi needs to travel 20 km to the hospital. Are you available to help?',
    status: 'open',
    volunteerName: null,
    response: null,
    respondedAt: null,
  },
];

// Read previously saved requests, merged onto the current seed list by id so a newly
// added seed request still shows up even if an older, shorter list was already saved.
function readStoredRequests() {
  let stored = [];
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    stored = saved ? JSON.parse(saved) : [];
  } catch {
    stored = [];
  }
  const storedById = new Map(stored.map((request) => [request.id, request]));
  return SEED_REQUESTS.map((seed) => storedById.get(seed.id) ?? seed);
}

function persist(requests) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Ignore storage failures; the in-memory list still works.
  }
}

// Provides { requests, respond(requestId, { volunteerName, response }) } to the whole app.
export function CareRequestProvider({ children }) {
  const [requests, setRequests] = useState(readStoredRequests);

  // Record a volunteer's response to a request; marks it as taken on the volunteer's side.
  const respond = useCallback((requestId, { volunteerName, response }) => {
    setRequests((previous) => {
      const next = previous.map((request) =>
        request.id === requestId
          ? { ...request, status: 'responded', volunteerName, response, respondedAt: new Date().toISOString() }
          : request,
      );
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ requests, respond }), [requests, respond]);

  return <CareRequestContext.Provider value={value}>{children}</CareRequestContext.Provider>;
}

// Hook returning { requests, respond } for use inside components.
export function useCareRequests() {
  const ctx = useContext(CareRequestContext);
  if (!ctx) {
    throw new Error('useCareRequests must be used inside a CareRequestProvider');
  }
  return ctx;
}
