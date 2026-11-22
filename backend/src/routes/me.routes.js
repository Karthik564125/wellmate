// GET /api/v1/me: the caller's profile, their active CareLinks, and - if
// this account is itself an elder with their own Elder document - that
// document's id, so the frontend knows whose data to show without a
// separate lookup.

import { Router } from "express";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import CareLink from "../models/CareLink.js";
import Elder from "../models/Elder.js";
import { toPublicUser } from "../models/User.js";

// deps is optional; tests pass fake models and a fake authenticate.
export function createMeRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const CareLinkModel = deps.CareLinkModel ?? CareLink;
  const ElderModel = deps.ElderModel ?? Elder;

  const router = Router();

  router.get("/me", authenticate, requireUser, async (req, res) => {
    const links = await CareLinkModel.find({ userId: req.user._id, status: "active" }).lean();
    const ownElder = await ElderModel.findOne({ userId: req.user._id }).lean();

    res.json({
      user: toPublicUser(req.user),
      ownElderId: ownElder ? String(ownElder._id) : null,
      carelinks: links.map((link) => ({
        elderId: String(link.elderId),
        relation: link.relation,
        permissions: link.permissions,
      })),
    });
  });

  return router;
}

export default createMeRouter();
