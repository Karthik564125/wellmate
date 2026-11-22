// Small keyword fallback for a few known cases only, per the plan: SOS
// trigger words, the three known medicine_pending phrases, and yes/no/cancel.
// Deliberately not a general keyword engine - everything else goes through
// Groq (ai.service.js).

function normalize(text) {
  return (text ?? "").toLowerCase().trim();
}

function includesAny(normalizedText, phrases) {
  return phrases.some((phrase) => normalizedText.includes(phrase));
}

// SOS overrides everything, in every conversation state. Telugu and English
// trigger words, from ELDER_DASHBOARD.md section 4G.
const SOS_PHRASES = [
  "help",
  "sos",
  "naaku bagaledu", // I am unwell
  "kindapaddaanu", // I have fallen
  "chest noppi", // chest pain
  "oopiri ledu", // can't breathe
  "rakthamu", // bleeding
  "spruhaledu", // unconscious
];

export function detectSOS(transcript) {
  return includesAny(normalize(transcript), SOS_PHRASES);
}

// The three known medicine_pending phrases from the plan (backend todo.md),
// matched as an immediate fast path so these specific, well-known cases never
// depend on Groq being reachable. Anything else about medicines still goes
// through Groq for real intent extraction.
const MEDICINE_PENDING_PHRASES = [
  "naaku tablets ayipoyayi",
  "medicine malli kavali",
  "naa mandulu aipoyayi",
];

export function detectMedicinePending(transcript) {
  return includesAny(normalize(transcript), MEDICINE_PENDING_PHRASES);
}

const YES_PHRASES = ["yes", "yeah", "yep", "sure", "avunu", " ho ", "sare"];
const NO_PHRASES = ["no", "nope", "vaddu", "ledu"];
const CANCEL_PHRASES = ["cancel", "aapu", "aagi", "aagandi"];

// Used only to interpret a reply while a conversation is awaiting_confirmation.
// Returns "yes" | "no" | "cancel" | null (null means the keyword fallback did
// not recognize the reply - the caller decides what to do then, e.g. re-ask).
export function detectYesNoCancel(transcript) {
  // Padded so the single-word check for "ho" doesn't match inside unrelated
  // words; everything else is specific enough not to need this.
  const normalized = ` ${normalize(transcript)} `;
  if (includesAny(normalized, CANCEL_PHRASES)) return "cancel";
  if (includesAny(normalized, YES_PHRASES)) return "yes";
  if (includesAny(normalized, NO_PHRASES)) return "no";
  return null;
}
