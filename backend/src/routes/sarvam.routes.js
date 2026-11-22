// Sarvam Samvaad bridge, mounted at /api/v1/sarvam (see routes/index.js).
//   POST /ticket     signed-in user gets a 600-second ticket plus the session path
//   GET  /s/:ticket/* widget session endpoint; ticket-gated, forwards to Sarvam
//   ALL  /runtime/*  signed-in user; proxies to Sarvam's app-runtime
// The Sarvam API key is added here and never reaches the browser.
// Never log tickets, URLs with query strings, keys, or elder data.

import express, { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { env } from "../config/env.js";
import { authenticate, requireUser } from "../middleware/authenticate.js";
import {
  createTicket,
  upstreamHeaders,
  verifyTicket,
} from "../services/sarvamRuntime.service.js";
import { ApiError } from "../utils/ApiError.js";

const TICKET_TTL_SECONDS = 600;
const UPSTREAM_TIMEOUT_MS = 10 * 1000;

// Same pattern as assistantRateLimiter in middleware/rateLimiter.js, but
// mounted after authenticate so req.user.id is set.
function createUserRateLimiter(limit) {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
    handler: (req, res, next) => {
      next(ApiError.rateLimited("Too many voice requests, slow down."));
    },
  });
}

const ticketRateLimiter = createUserRateLimiter(10);
// The widget makes many small calls per conversation, so this allows more.
const runtimeRateLimiter = createUserRateLimiter(60);

const router = Router();

function runtimeBaseUrl() {
  return env.SARVAM_RUNTIME_BASE_URL.replace(/\/+$/, "");
}

function sendNotConfigured(res) {
  return res.status(503).json({ error: "sarvam_not_configured" });
}

function sessionConfigMissing() {
  return !(
    env.SARVAM_API_KEY &&
    env.SARVAM_SESSION_TICKET_SECRET &&
    env.SARVAM_APP_ID &&
    env.SARVAM_ORG_ID &&
    env.SARVAM_WORKSPACE_ID
  );
}


// Forwards the request body as the client sent it. Non-JSON bodies arrive as a
// Buffer via express.raw; JSON bodies were already parsed by the global parser.
function runtimeRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (Buffer.isBuffer(req.body)) return req.body.length > 0 ? req.body : undefined;
  if (req.body && typeof req.body === "object") {
    const hasContent = Array.isArray(req.body) || Object.keys(req.body).length > 0;
    return hasContent ? JSON.stringify(req.body) : undefined;
  }
  return undefined;
}

// Sends one request upstream and relays status, content-type and body unchanged.
// Logs only the route and status, and only on failure.
async function forwardUpstream(res, { route, url, method, headers, body }) {
  let upstream;
  let responseBody;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    responseBody = Buffer.from(await upstream.arrayBuffer());
  } catch {
    console.error({ route, status: 502 });
    return res.status(502).json({ error: "sarvam_unreachable" });
  }

  if (upstream.status >= 400) {
    console.error({ route, status: upstream.status });
  }
  res.status(upstream.status);
  res.type(upstream.headers.get("content-type") ?? "application/octet-stream");
  return res.send(responseBody);
}

router.post("/ticket", authenticate, requireUser, ticketRateLimiter, (req, res) => {
  if (sessionConfigMissing()) return sendNotConfigured(res);
  const ticket = createTicket({ userId: req.user.id });
  res.json({
    ticket,
    expiresInSeconds: TICKET_TTL_SECONDS,
    sessionEndpointPath: `/api/v1/sarvam/s/${ticket}/`,
    appId: env.SARVAM_APP_ID,
    orgId: env.SARVAM_ORG_ID,
    workspaceId: env.SARVAM_WORKSPACE_ID,
  });
});

const sessionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (req, res, next) => {
    next(ApiError.rateLimited("Too many voice requests, slow down."));
  },
});

// The widget appends "orgs/{org}/workspaces/{ws}/apps/{app}/url" to the endpoint.
// The ticket is the credential (the widget cannot send headers), so no Firebase auth here.
router.get("/s/:ticket/*rest", sessionRateLimiter, async (req, res) => {
  if (sessionConfigMissing()) return sendNotConfigured(res);
  if (!verifyTicket(req.params.ticket)) {
    return res.status(401).json({ error: "invalid_ticket" });
  }
  const remainder = [req.params.rest ?? []].flat().join("/");
  if (/\.\.|%2e/i.test(remainder)) {
    return res.status(400).json({ error: "invalid_path" });
  }
  const queryIndex = req.originalUrl.indexOf("?");
  const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
  return forwardUpstream(res, {
    route: "sarvam.session",
    url: `${runtimeBaseUrl()}/${remainder}${query}`,
    method: "GET",
    headers: upstreamHeaders(),
    body: undefined,
  });
});

// router.use strips the "/runtime" prefix, so req.path is the upstream path.
router.use(
  "/runtime",
  authenticate,
  runtimeRateLimiter,
  express.raw({ type: "*/*", limit: "1mb" }),
  async (req, res) => {
    if (!env.SARVAM_API_KEY) return sendNotConfigured(res);
    if (/\.\.|%2e/i.test(req.path)) {
      return res.status(400).json({ error: "invalid_path" });
    }

    // Keep the query string exactly as sent.
    const queryIndex = req.originalUrl.indexOf("?");
    const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);

    const body = runtimeRequestBody(req);
    const headers = { ...upstreamHeaders() };
    if (body !== undefined) {
      headers["Content-Type"] = req.get("content-type") ?? "application/json";
    }
    const accept = req.get("accept");
    if (accept) headers.Accept = accept;

    return forwardUpstream(res, {
      route: "sarvam.runtime",
      url: `${runtimeBaseUrl()}${req.path}${query}`,
      method: req.method,
      headers,
      body,
    });
  }
);

export default router;
