// Thin wrappers around the backend's email-based elder/family connection
// endpoints. No invite codes - a family/admin account connects itself to an
// elder (or an elder/family editor connects a family member) just by email,
// as long as that email already belongs to a signed-up account.

import { api } from './client.js';

// Family/admin side: connect the signed-in account to an elder by their email.
export function connectElderByEmail(data) {
  return api.post('/elders/connect-by-email', data);
}

// Elder (or family editor) side: connect a family member to this elder by their email.
export function connectFamilyMemberByEmail(elderId, data) {
  return api.post(`/elders/${elderId}/family/connect-by-email`, data);
}
