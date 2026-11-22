// Thin wrappers around the backend's Chitti voice endpoints. The UI never
// builds these requests itself - it goes through chittiVoice.js, which
// calls these.

import { api } from './client.js';
import { firebaseAuth } from '../firebase/firebaseClient.js';

// audioBlob: whatever the browser's MediaRecorder produced. filename/mimeType
// describe it, so the backend can validate the type.
export function speechToText({ elderId, audioBlob, filename, mimeType, language }) {
  const form = new FormData();
  form.append('elderId', elderId);
  if (language) form.append('language', language);
  form.append('audio', audioBlob, filename ?? `clip.${mimeType?.split('/')[1] ?? 'webm'}`);
  return api.post('/assistant/speech-to-text', form);
}

export function turn({ elderId, message, language }) {
  return api.post('/assistant/turn', { elderId, message, language });
}

export function confirm({ conversationId }) {
  return api.post('/assistant/confirm', { conversationId });
}

export function getConversation(id) {
  return api.get(`/assistant/conversations/${id}`);
}

// Returns a Blob (audio/wav) the caller can play, not JSON - api.post()
// parses every response as JSON, so this one builds its own fetch below
// instead of going through the shared client.
export async function speak({ text, language }) {
  const headers = { 'Content-Type': 'application/json' };
  if (firebaseAuth.currentUser) {
    headers.Authorization = `Bearer ${await firebaseAuth.currentUser.getIdToken()}`;
  }

  const base = import.meta.env.VITE_API_BASE_URL;
  const response = await fetch(`${base}/assistant/speak`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Text-to-speech failed');
  }

  return response.blob();
}

// Demo-mode counterparts: same Sarvam STT/TTS, but no auth header and no
// elderId - demo mode has no real signed-in account or elder behind it.
export function demoSpeechToText({ audioBlob, filename, mimeType, language }) {
  const form = new FormData();
  if (language) form.append('language', language);
  form.append('audio', audioBlob, filename ?? `clip.${mimeType?.split('/')[1] ?? 'webm'}`);
  return api.post('/assistant/demo/speech-to-text', form);
}

export async function demoSpeak({ text, language }) {
  const base = import.meta.env.VITE_API_BASE_URL;
  const response = await fetch(`${base}/assistant/demo/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Text-to-speech failed');
  }

  return response.blob();
}
