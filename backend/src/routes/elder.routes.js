// POST   /api/v1/elders                 (admin or family only; bootstraps the creator's CareLink)
// GET/PUT /api/v1/elders/:elderId/profile

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import { authorize, authorizeLinked } from "../middleware/authorize.js";
import CareLink, { CARELINK_PERMISSIONS } from "../models/CareLink.js";
import Elder, { ELDER_GENDERS, PREFERRED_LANGUAGES, toPublicElder } from "../models/Elder.js";
import { ApiError } from "../utils/ApiError.js";

// Roles allowed to create a brand-new elder. The elder themself is excluded:
// an elder's own account, if one exists, is linked to an Elder document by a
// family member or admin, not by self-registering one.
const ELDER_CREATOR_ROLES = ["admin", "family"];

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(ELDER_GENDERS).optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  address: z.string().optional(),
  area: z.string().optional(),
  photoUrl: z.string().optional(),
  preferredLanguage: z.enum(PREFERRED_LANGUAGES).optional(),
});

// Same fields as an update, but displayName is required, plus an optional
// "relation" (the creator's relation to this elder, e.g. "daughter") that is
// stored on the auto-created CareLink below, not on the Elder document itself.
const createElderSchema = profileUpdateSchema.extend({
  displayName: z.string().trim().min(1, "displayName is required"),
  relation: z.string().trim().optional(),
});

function toPublicCreatorLink(link) {
  return {
    id: String(link._id),
    relation: link.relation,
    permissions: link.permissions,
    status: link.status,
  };
}

// deps is optional; tests pass a fake ElderModel, CareLinkModel and fake authorize/authenticate deps.
export function createElderRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const ElderModel = deps.ElderModel ?? Elder;
  const CareLinkModel = deps.CareLinkModel ?? CareLink;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  router.post("/elders", authenticate, requireUser, async (req, res) => {
    if (!ELDER_CREATOR_ROLES.includes(req.user.role)) {
      throw ApiError.forbidden("Only family members or admins can create a new elder profile");
    }

    const parsed = createElderSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw ApiError.validationFailed("Invalid elder data", {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { relation, ...elderFields } = parsed.data;
    const elder = await ElderModel.create(elderFields);

    // Bootstrap: without this, the creator could not even invite anyone else
    // afterward, since /care-links/invite itself requires editProfile.
    const carelink = await CareLinkModel.create({
      elderId: elder._id,
      userId: req.user._id,
      relation,
      permissions: [...CARELINK_PERMISSIONS],
      status: "active",
      invitedBy: req.user._id,
    });

    res.status(201).json({
      elder: toPublicElder(elder),
      carelink: toPublicCreatorLink(carelink),
    });
  });

  router.get(
    "/elders/:elderId/profile",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      const elder = await ElderModel.findById(req.params.elderId);
      if (!elder) throw ApiError.notFound("Elder not found");
      res.json({ elder: toPublicElder(elder) });
    }
  );

  router.put(
    "/elders/:elderId/profile",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const parsed = profileUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw ApiError.validationFailed("Invalid profile data", {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      const elder = await ElderModel.findByIdAndUpdate(
        req.params.elderId,
        { $set: parsed.data },
        { returnDocument: "after", runValidators: true }
      );
      if (!elder) throw ApiError.notFound("Elder not found");

      res.json({ elder: toPublicElder(elder) });
    }
  );

  return router;
}

export default createElderRouter();
