// Thin wrappers around the backend's appointment CRUD endpoints.

import { api } from './client.js';

export function listAppointments(elderId) {
  return api.get(`/elders/${elderId}/appointments`);
}

export function createAppointment(elderId, data) {
  return api.post(`/elders/${elderId}/appointments`, data);
}

export function updateAppointment(id, data) {
  return api.patch(`/appointments/${id}`, data);
}

export function deleteAppointment(id) {
  return api.delete(`/appointments/${id}`);
}

// Demo mode's counterparts: same backend, same real MongoDB documents, but
// no auth - demo mode has no real signed-in account. Scoped server-side to
// one reserved, shared "demo elder" so every demo-mode profile view reads
// and writes the same live data instead of each keeping its own local copy.
export function listDemoAppointments() {
  return api.get('/appointments/demo');
}

export function createDemoAppointment(data) {
  return api.post('/appointments/demo', data);
}

export function updateDemoAppointment(id, data) {
  return api.patch(`/appointments/demo/${id}`, data);
}

export function deleteDemoAppointment(id) {
  return api.delete(`/appointments/demo/${id}`);
}
