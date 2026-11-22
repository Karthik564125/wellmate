// Sarvam Samvaad (app-runtime) helpers: short-lived session tickets and the
// upstream auth header. Uses only Node's built-in crypto module.
//
// A ticket is `base64url(payload).base64url(signature)`, where payload is
// JSON `{ uid, exp }` and signature is HMAC-SHA256 over `uid.exp`.

import crypto from "node:crypto";

import { env } from "../config/env.js";

const TICKET_TTL_SECONDS = 600;

// Thrown when a required Sarvam env value is missing. Routes map it to 503.
export class SarvamConfigError extends Error {
  constructor(message = "Sarvam is not configured") {
    super(message);
    this.name = "SarvamConfigError";
    this.code = "sarvam_not_configured";
  }
}

function requireTicketSecret() {
  if (!env.SARVAM_SESSION_TICKET_SECRET) {
    throw new SarvamConfigError("SARVAM_SESSION_TICKET_SECRET is not set");
  }
  return env.SARVAM_SESSION_TICKET_SECRET;
}

function sign(secret, uid, exp) {
  return crypto.createHmac("sha256", secret).update(`${uid}.${exp}`).digest();
}

export function createTicket({ userId }) {
  const secret = requireTicketSecret();
  const uid = String(userId);
  const exp = Math.floor(Date.now() / 1000) + TICKET_TTL_SECONDS;

  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url");
  const signature = sign(secret, uid, exp).toString("base64url");
  return `${payload}.${signature}`;
}

// Returns the user id for a valid, unexpired ticket, or null otherwise.
export function verifyTicket(ticket) {
  const secret = requireTicketSecret();
  if (typeof ticket !== "string") return null;

  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, signaturePart] = parts;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.uid !== "string" || !Number.isInteger(payload.exp)) {
    return null;
  }

  const expected = sign(secret, payload.uid, payload.exp);
  const actual = Buffer.from(signaturePart, "base64url");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  if (payload.exp * 1000 <= Date.now()) return null;
  return payload.uid;
}

export function upstreamHeaders() {
  if (!env.SARVAM_API_KEY) {
    throw new SarvamConfigError("SARVAM_API_KEY is not set");
  }
  return { "X-API-Key": env.SARVAM_API_KEY };
}
