// Chitti's voice layer. The UI never touches MediaRecorder, the Web Speech
// API, or the assistant endpoints directly - it only calls the functions
// exported here, so swapping providers never touches any screen component.
//
// Two speech-to-text providers behind one interface:
//   - Sarvam (via the backend) - the decided provider, used by default.
//   - Browser (Web Speech API)  - a fallback for local testing only, not
//     wired into the UI automatically; see isBrowserSpeechSupported().
// Text-to-speech always tries the backend (Sarvam) first and falls back to
// the browser's own speech synthesis if that call fails, per the plan.

import { demoSpeak, demoSpeechToText, speak, speechToText } from '../api/assistant.js';

const CANDIDATE_MIME_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4'];

function pickRecorderMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return '';
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

// Returns { start(), stop() }. start() asks for the microphone and begins
// recording; stop() ends it and resolves with the recorded audio Blob.
export function createRecorder() {
  let mediaRecorder;
  let stream;
  let chunks = [];

  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickRecorderMimeType();
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    mediaRecorder.start();
  }

  function stop() {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('Recording was never started'));
        return;
      }
      mediaRecorder.addEventListener('stop', () => {
        stream.getTracks().forEach((track) => track.stop());
        resolve(new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' }));
      });
      mediaRecorder.stop();
    });
  }

  return { start, stop };
}

export function isRecordingSupported() {
  return typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(window.MediaRecorder);
}

// Sarvam provider (decided, default path): upload the recorded clip to the
// backend, which calls Sarvam. Returns { transcript, language }.
export async function transcribeAudio({ elderId, audioBlob, language }) {
  const mimeType = audioBlob.type || 'audio/webm';
  return speechToText({ elderId, audioBlob, mimeType, language });
}

// Demo mode's counterpart: same Sarvam STT, but no elderId/auth - see
// api/assistant.js's demoSpeechToText for why that's safe.
export async function transcribeAudioDemo({ audioBlob, language }) {
  const mimeType = audioBlob.type || 'audio/webm';
  return demoSpeechToText({ audioBlob, mimeType, language });
}

// Browser provider (testing fallback only): the Web Speech API transcribes
// directly in the browser, with no recording step and no backend call.
export function isBrowserSpeechSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function listenWithBrowserSpeech({ language }) {
  return new Promise((resolve, reject) => {
    const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!Recognition) {
      reject(new Error('Browser speech recognition is not supported here'));
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language === 'en' ? 'en-IN' : 'te-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Without this, silence (or a phrase the engine can't transcribe) ends
    // recognition with neither a 'result' nor an 'error' event in some
    // browsers, leaving this promise - and the UI's "listening" state -
    // hanging forever. 'end' always fires, so it's the backstop: if nothing
    // else already settled the promise, treat it as "didn't catch that".
    let settled = false;
    recognition.addEventListener('result', (event) => {
      settled = true;
      resolve({ transcript: event.results[0][0].transcript, language });
    });
    recognition.addEventListener('error', (event) => {
      settled = true;
      reject(new Error(event.error));
    });
    recognition.addEventListener('end', () => {
      if (!settled) {
        settled = true;
        reject(new Error('no-speech'));
      }
    });
    recognition.start();
  });
}

// The Web Speech API exposes no gender field on a voice, so picking a "male"
// one is a best-effort name heuristic against whatever TTS voices happen to
// be installed - it depends on the device. Common Indian-language male voice
// names (Windows SAPI, Android, Chrome OS) are listed here to improve the odds.
const MALE_VOICE_NAME_HINTS = ['male', 'hemant', 'ravi', 'prabhat', 'madhur', 'rishi', 'ajit'];

function pickBestVoice(language) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Telugu TTS voices are rare; fall back to Hindi (closer than English), then anything for the language.
  const preferredLangPrefixes = language === 'te' ? ['te', 'hi'] : [language ?? 'en'];
  for (const prefix of preferredLangPrefixes) {
    const candidates = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(prefix));
    if (candidates.length === 0) continue;
    const male = candidates.find((voice) => MALE_VOICE_NAME_HINTS.some((hint) => voice.name.toLowerCase().includes(hint)));
    return male ?? candidates[0];
  }
  return null;
}

// Chrome/Edge load the voice list asynchronously; wait briefly for it rather
// than picking before it's populated (with a timeout so this never hangs).
function waitForVoices() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, 300);
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

async function speakWithBrowserSynthesis(text, language) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  await waitForVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'en' ? 'en-IN' : 'te-IN';
  // Nudges a default/female-leaning voice toward a deeper, more masculine tone,
  // on top of whichever voice pickBestVoice() found.
  utterance.pitch = 0.8;
  // Default rate (1.0) reads too fast for an elderly listener; slow it down.
  utterance.rate = 0.8;
  const voice = pickBestVoice(language);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function playAudioBlob(audioBlob) {
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  return new Promise((resolve, reject) => {
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
      resolve();
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    });
    audio.play().catch(reject);
  });
}

// Speaks Chitti's reply out loud: Sarvam TTS via the backend first, falling
// back to the browser's own speech synthesis if that call fails.
export async function speakReply({ text, language }) {
  try {
    await playAudioBlob(await speak({ text, language }));
  } catch {
    await speakWithBrowserSynthesis(text, language);
  }
}

// Demo mode's counterpart: tries Sarvam (via the unauthenticated demo route)
// first, same as speakReply, falling back to the browser's own voice if
// Sarvam fails (no credits, no network, ...) - so the demo never goes silent.
export async function speakReplyDemo({ text, language }) {
  try {
    await playAudioBlob(await demoSpeak({ text, language }));
  } catch {
    await speakWithBrowserSynthesis(text, language);
  }
}
