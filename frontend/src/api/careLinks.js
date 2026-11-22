// Thin wrappers around the backend's CareLink invite/accept endpoints.

import { api } from './client.js';

export function inviteCareLink(elderId, data) {
  return api.post(`/elders/${elderId}/care-links/invite`, data);
}

export function acceptCareLink(data) {
  return api.post('/care-links/accept', data);
}
