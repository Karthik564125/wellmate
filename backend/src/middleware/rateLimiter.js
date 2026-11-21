// Rate limiting for the voice assistant endpoints (Sarvam/Groq calls are
// expensive and user-triggered). Per backend todo: "rate limit on
// /assistant/* (per user)". Keyed by req.user.id once auth middleware exists;
// falls back to IP until then, since no route is wired up under this path yet.

import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { ApiError } from "../utils/ApiError.js";

export const assistantRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // generous for a demo; tune once real usage is observed
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  handler: (req, res, next) => {
    next(ApiError.rateLimited("Too many assistant requests, slow down."));
  },
});
