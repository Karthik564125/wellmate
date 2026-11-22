// Groq intent extraction for the Chitti voice assistant. No Express types
// here; routes translate errors into ApiError.
//
// The LLM never touches the database and never decides permissions - it
// only ever returns JSON, which is validated here with Zod before the
// backend trusts any of it. Spiked live against Groq's real API (see
// conversation history): strict JSON schema works correctly on this model,
// fast (sub-1s warm) and accurate on mixed Telugu/English test sentences.

import { z } from "zod";

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 1; // one retry on a 5xx or network failure, per the plan

export const INTENTS = [
  "medicine_pending",
  "medicine_taken",
  "medicine_reminder",
  "medicine_schedule_query",
  "talk_family",
  "call_doctor",
  "grocery",
  "recharge",
  "transport",
  "sos",
  "other",
];

// Mirrors GROQ_JSON_SCHEMA below field-for-field. The backend never trusts
// Groq's output just because the API accepted it - this is the real gate.
const intentResultSchema = z.object({
  intent: z.enum(INTENTS),
  confidence: z.number().min(0).max(1),
  details: z.object({
    medicineName: z.string().nullable(),
    quantity: z.string().nullable(),
    doseTime: z.string().nullable(),
    message: z.string().nullable(),
    items: z.array(z.string()).nullable(),
    days: z.number().nullable(),
    location: z.string().nullable(),
    transportType: z.string().nullable(),
    doctorName: z.string().nullable(),
  }),
  missingFields: z.array(z.string()),
  requiresConfirmation: z.boolean(),
  replyLanguage: z.enum(["te", "en"]),
});

const GROQ_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: INTENTS },
    confidence: { type: "number" },
    details: {
      type: "object",
      properties: {
        medicineName: { type: ["string", "null"] },
        quantity: { type: ["string", "null"] },
        doseTime: { type: ["string", "null"] },
        message: { type: ["string", "null"] },
        items: { type: ["array", "null"], items: { type: "string" } },
        days: { type: ["number", "null"] },
        location: { type: ["string", "null"] },
        transportType: { type: ["string", "null"] },
        doctorName: { type: ["string", "null"] },
      },
      required: [
        "medicineName",
        "quantity",
        "doseTime",
        "message",
        "items",
        "days",
        "location",
        "transportType",
        "doctorName",
      ],
      additionalProperties: false,
    },
    missingFields: { type: "array", items: { type: "string" } },
    requiresConfirmation: { type: "boolean" },
    replyLanguage: { type: "string", enum: ["te", "en"] },
  },
  required: [
    "intent",
    "confidence",
    "details",
    "missingFields",
    "requiresConfirmation",
    "replyLanguage",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  "You are Chitti, an elder-care voice assistant intent extractor for Telugu/English speakers in India. " +
  "Extract the single best-matching intent and structured details from the elder's spoken message, using any " +
  "details already collected earlier this conversation (given below, if any) as context. Never guess a medicine " +
  "name, quantity, or any other detail the elder did not actually say - leave it null and list its field name in " +
  "missingFields instead. Set requiresConfirmation true for any intent that creates a request or alert for family " +
  "(medicine_pending, sos, grocery, recharge, transport, call_doctor, talk_family); false for read-only intents " +
  "(medicine_reminder, medicine_schedule_query, medicine_taken, other). " +
  "replyLanguage must match the dominant language of the elder's message (te or en).";

// deps.fetchImpl/deps.timeoutMs let tests inject a fake network layer.
async function callGroq(messages, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GROQ_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          stream: false,
          temperature: 0.2,
          max_completion_tokens: 512,
          reasoning_effort: "low",
          messages,
          response_format: {
            type: "json_schema",
            json_schema: { name: "chitti_intent", schema: GROQ_JSON_SCHEMA, strict: true },
          },
        }),
      });
      if (res.status >= 500 && attempt < MAX_RETRIES) continue;
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("Groq request failed");
}

// transcript: what the elder said (already transcribed by Sarvam STT).
// collectedDetails: details gathered earlier this conversation, if any, so a
// follow-up answer is interpreted as continuing it, not as a brand-new message.
// Returns a Zod-validated result, or throws ApiError.upstreamFailed.
export async function extractIntent({ transcript, collectedDetails = {} }, deps = {}) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        Object.keys(collectedDetails).length > 0
          ? `Already collected this conversation: ${JSON.stringify(collectedDetails)}\n\nElder just said: ${transcript}`
          : transcript,
    },
  ];

  let res;
  try {
    res = await callGroq(messages, deps);
  } catch (err) {
    throw ApiError.upstreamFailed("Intent extraction request failed", { cause: err.message });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw ApiError.upstreamFailed("Intent extraction failed", {
      groqMessage: body?.error?.message,
      groqType: body?.error?.type,
    });
  }

  const content = body?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw ApiError.upstreamFailed("Intent extraction returned unparseable content", {});
  }

  const result = intentResultSchema.safeParse(parsed);
  if (!result.success) {
    throw ApiError.upstreamFailed("Intent extraction returned a result that failed validation", {
      issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  return result.data;
}
