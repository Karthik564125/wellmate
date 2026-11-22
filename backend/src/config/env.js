// Loads and validates backend environment variables.
// Fails fast (exits the process) on startup if anything required is missing
// or malformed, instead of letting a service crash later with a vague error.
//
// Usage elsewhere in the app:
//   import { env } from "../config/env.js";
//   env.MONGODB_URI, env.PORT, etc.

import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  // --- Server ---
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  // Exact origin of the frontend; CORS is locked to this single value.
  FRONTEND_ORIGIN: z.string().url(),

  // --- Database ---
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // --- Firebase Admin SDK ---
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  // Stored in .env with literal "\n" escapes; unescape into real newlines here
  // so every consumer gets a key that's already usable as-is.
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, "\n")),

  // --- Groq (intent extraction) ---
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1),

  // --- Sarvam AI (speech-to-text / text-to-speech) ---
  // Optional so the server still boots without Sarvam; code that needs a key
  // checks for it and answers 503 instead.
  SARVAM_API_KEY: z.string().optional(),
  SARVAM_STT_MODEL: z.string().optional(),
  // bulbul:v3 is Sarvam's own API default and the model "shubh" (below) is
  // confirmed to require - set explicitly so a future default change on
  // Sarvam's side can't silently break the speaker/model pairing.
  SARVAM_TTS_MODEL: z.string().default("bulbul:v3"),
  // "shubh" is Sarvam's documented male voice recommended for Telugu/Hindi.
  // Override to try a different voice without a code change.
  SARVAM_TTS_SPEAKER: z.string().default("shubh"),

  // --- Sarvam Samvaad (app-runtime session tickets and proxy) ---
  SARVAM_APP_ID: z.string().optional(),
  SARVAM_WORKSPACE_ID: z.string().optional(),
  SARVAM_ORG_ID: z.string().optional(),
  // HMAC key for short-lived session tickets. Server-side only.
  SARVAM_SESSION_TICKET_SECRET: z.string().optional(),
  // A blank value falls back to the default: a blank .env line would otherwise
  // fail url() and exit the process.
  SARVAM_RUNTIME_BASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().default("https://apps.sarvam.ai/api/app-runtime")
  ),
  SARVAM_SESSION_PATH: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().default("/session")
  ),

  // --- Resend (email) ---
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    // eslint-disable-next-line no-console
    console.error(
      `Invalid or missing environment variables. Fix backend/.env (see backend/.env.example):\n${issues}`
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
