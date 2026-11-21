// GET /api/v1/me: the caller's profile and their active CareLinks.

import { Router } from "express";

import { authenticate, requireUser } from "../middleware/authenticate.js";
import CareLink from "../models/CareLink.js";
import { toPublicUser } from "../models/User.js";

const router = Router();

router.get("/me", authenticate, requireUser, async (req, res) => {
  const links = await CareLink.find({ userId: req.user._id, status: "active" }).lean();

  res.json({
    user: toPublicUser(req.user),
    carelinks: links.map((link) => ({
      elderId: String(link.elderId),
      relation: link.relation,
      permissions: link.permissions,
    })),
  });
});

export default router;
