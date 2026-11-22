// Thin wrappers around the backend's caretaker CRUD and caretaker-to-elder assignment endpoints.

import { api } from './client.js';

export function listCaretakers() {
  return api.get('/caretakers');
}

export function listElderCaretakers(elderId) {
  return api.get(`/elders/${elderId}/caretakers`);
}

export function createCaretaker(data) {
  return api.post('/caretakers', data);
}

export function updateCaretaker(id, data) {
  return api.patch(`/caretakers/${id}`, data);
}

export function deleteCaretaker(id) {
  return api.delete(`/caretakers/${id}`);
}

export function assignCaretaker(elderId, caretakerId) {
  return api.post(`/elders/${elderId}/caretaker-assignments`, { caretakerId });
}

export function unassignCaretaker(elderId, caretakerId) {
  return api.delete(`/elders/${elderId}/caretaker-assignments/${caretakerId}`);
}
