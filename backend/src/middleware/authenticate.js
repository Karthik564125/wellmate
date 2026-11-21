// Authentication: verifies the Firebase ID token and loads the matching User.
// Errors are thrown as ApiError and reach the central errorHandler (Express 5 forwards async throws).

import { getFirebaseAuth } from "../FireBase/firebase.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

// deps is optional; tests pass a fake verifyIdToken and a fake UserModel.
export function createAuthenticate(deps = {}) {
  const verifyIdToken =
    deps.verifyIdToken ?? ((token) => getFirebaseAuth().verifyIdToken(token));
  const UserModel = deps.UserModel ?? User;

  return async function authenticate(req, res, next) {
    const header = req.headers?.authorization;
    const match = typeof header === "string" ? BEARER_PATTERN.exec(header.trim()) : null;
    if (!match) {
      throw ApiError.unauthenticated("Missing or malformed Authorization header");
    }

    let decoded;
    try {
      decoded = await verifyIdToken(match[1]);
    } catch {
      throw ApiError.unauthenticated("Invalid or expired token");
    }

    req.auth = { uid: decoded.uid };
    req.user = (await UserModel.findOne({ authUid: decoded.uid })) ?? null;
    next();
  };
}

export const authenticate = createAuthenticate();

// Use after authenticate on routes that need an existing User profile.
export function requireUser(req, res, next) {
  if (!req.user) {
    throw ApiError.unauthenticated("No user profile exists for this account");
  }
  next();
}
