// Authorization: checks CareLink access between the caller and an elder.

import mongoose from "mongoose";
import CareLink from "../models/CareLink.js";
import { ApiError } from "../utils/ApiError.js";

// deps is optional; { CareLink } lets tests inject a fake model.
export async function canAccessElder(userId, elderId, permission, deps = {}) {
  const CareLinkModel = deps.CareLink ?? CareLink;

  // A malformed id cannot match any link; return false instead of a CastError (500).
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(elderId)) {
    return false;
  }

  const link = await CareLinkModel.findOne({ elderId, userId });
  if (!link || link.status !== "active") return false;
  return Array.isArray(link.permissions) && link.permissions.includes(permission);
}

// Factory: authorize("viewMedicines") guards a route with :elderId in its path.
// Must run after authenticate.
export function authorize(permission, deps = {}) {
  return async function authorizeMiddleware(req, res, next) {
    if (!req.user) {
      throw ApiError.unauthenticated("No user profile exists for this account");
    }

    const allowed = await canAccessElder(req.user._id, req.params.elderId, permission, deps);
    if (!allowed) {
      throw ApiError.forbidden("You do not have permission for this elder");
    }
    next();
  };
}
