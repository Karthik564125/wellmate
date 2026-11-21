// Authorization: checks whether a user may act on a given elder, either as
// the elder themself (owner) or via an active CareLink.

import mongoose from "mongoose";
import CareLink from "../models/CareLink.js";
import Elder from "../models/Elder.js";
import { ApiError } from "../utils/ApiError.js";

// deps is optional; { CareLink, Elder } lets tests inject fake models.
// permission: a specific CareLink permission to require, or null/undefined
// to accept any active link (no specific permission needed).
export async function canAccessElder(userId, elderId, permission, deps = {}) {
  const CareLinkModel = deps.CareLink ?? CareLink;
  const ElderModel = deps.Elder ?? Elder;

  // A malformed id cannot match any link; return false instead of a CastError (500).
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(elderId)) {
    return false;
  }

  // Owner bypass: an elder with their own account always has full access to
  // their own profile, independent of any CareLink or permission.
  const elder = await ElderModel.findById(elderId);
  if (elder?.userId && String(elder.userId) === String(userId)) {
    return true;
  }

  const link = await CareLinkModel.findOne({ elderId, userId });
  if (!link || link.status !== "active") return false;
  if (!permission) return true;
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

// Any active CareLink (or being the elder) is enough; no specific
// permission required. Use for reads that aren't gated by a single
// permission flag (e.g. the basic elder profile).
export function authorizeLinked(deps = {}) {
  return authorize(null, deps);
}

// Factory for routes keyed by the sub-resource's own :id, not :elderId
// (e.g. PATCH/DELETE /conditions/:id, /doctors/:id, /emergency-contacts/:id,
// /insurance/:id - per the API list, these never carry the elder id in the
// path). Loads the document first to find its elderId, then runs the same
// check as authorize(). Attaches the loaded document to req.resource so the
// route handler doesn't have to fetch it again.
// Must run after authenticate.
export function authorizeSubresource(ResourceModel, permission, deps = {}) {
  return async function authorizeSubresourceMiddleware(req, res, next) {
    if (!req.user) {
      throw ApiError.unauthenticated("No user profile exists for this account");
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      throw ApiError.notFound("Not found");
    }

    const resource = await ResourceModel.findById(req.params.id);
    if (!resource) {
      throw ApiError.notFound("Not found");
    }

    const allowed = await canAccessElder(req.user._id, resource.elderId, permission, deps);
    if (!allowed) {
      throw ApiError.forbidden("You do not have permission for this elder");
    }

    req.resource = resource;
    next();
  };
}
