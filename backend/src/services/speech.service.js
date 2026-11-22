// Sarvam AI speech-to-text and text-to-speech. No Express types here;
// routes translate errors into ApiError.
//
// Request/response shapes come from Sarvam's docs and one real spike call
// (which got past auth and request validation, failing only on account
// quota - so the shapes below are confirmed correct, just not yet verified
// against real recorded speech). Re-check once the account has credits.

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const STT_URL = "https://api.sarvam.ai/speech-to-text";
const TTS_URL = "https://api.sarvam.ai/text-to-speech";
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 1; // one retry on a 5xx or network failure, per the plan

function sarvamErrorDetails(body) {
  return {
    sarvamCode: body?.error?.code,
    sarvamMessage: body?.error?.message,
    requestId: body?.error?.request_id,
  };
}

// deps.fetchImpl lets tests inject a fake fetch; deps.timeoutMs shortens the
// timeout in tests. Retries once on a 5xx response or a thrown network error.
async function callSarvam(url, init, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { ...init, signal: controller.signal });
      if (res.status >= 500 && attempt < MAX_RETRIES) continue;
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("Sarvam request failed");
}

// buffer: raw audio bytes from the elder's recording (multer memory upload).
// filename/mimeType describe what the browser actually sent (MediaRecorder
// typically produces audio/webm). languageCode is BCP-47 (e.g. "te-IN",
// "en-IN"); omit it to let Sarvam auto-detect the language.
export async function speechToText({ buffer, filename = "audio.webm", mimeType = "audio/webm", languageCode }, deps = {}) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), filename);
  if (env.SARVAM_STT_MODEL) form.append("model", env.SARVAM_STT_MODEL);
  form.append("mode", "transcribe");
  if (languageCode) form.append("language_code", languageCode);

  let res;
  try {
    res = await callSarvam(
      STT_URL,
      { method: "POST", headers: { "api-subscription-key": env.SARVAM_API_KEY }, body: form },
      deps
    );
  } catch (err) {
    throw ApiError.upstreamFailed("Speech-to-text request failed", { cause: err.message });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw ApiError.upstreamFailed("Speech-to-text failed", sarvamErrorDetails(body));
  }

  return {
    transcript: body?.transcript ?? "",
    languageCode: body?.language_code ?? languageCode ?? null,
    languageProbability: body?.language_probability ?? null,
  };
}

// text: the reply to speak back to the elder. languageCode is required by
// Sarvam's TTS (unlike STT, it does not auto-detect).
export async function textToSpeech({ text, languageCode }, deps = {}) {
  let res;
  try {
    res = await callSarvam(
      TTS_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-subscription-key": env.SARVAM_API_KEY },
        body: JSON.stringify({
          text,
          language_code: languageCode,
          model: env.SARVAM_TTS_MODEL,
          speaker: env.SARVAM_TTS_SPEAKER,
          output_audio_codec: "wav",
        }),
      },
      deps
    );
  } catch (err) {
    throw ApiError.upstreamFailed("Text-to-speech request failed", { cause: err.message });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw ApiError.upstreamFailed("Text-to-speech failed", sarvamErrorDetails(body));
  }

  const base64Audio = body?.audios?.[0];
  if (!base64Audio) {
    throw ApiError.upstreamFailed("Text-to-speech returned no audio", {});
  }

  return { audioBuffer: Buffer.from(base64Audio, "base64"), contentType: "audio/wav" };
}
