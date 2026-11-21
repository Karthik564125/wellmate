// CareLink invites and membership.
// POST   /api/v1/elders/:elderId/care-links/invite
// POST   /api/v1/care-links/accept
// GET    /api/v1/elders/:elderId/family
// PATCH  /api/v1/care-links/:id
// DELETE /api/v1/care-links/:id

import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, canAccessElder } from "../middleware/authorize.js";
import CareLink, { CARELINK_PERMISSIONS } from "../models/CareLink.js";
import Elder from "../models/Elder.js";
import User, { toPublicUser } from "../models/User.js";
import {
  INVITE_TTL_DAYS,
  generateInviteCode,
  hashInviteCode,
} from "../services/careLink.service.js";
import { ApiError } from "../utils/ApiError.js";

const DEFAULT_INVITE_PERMISSIONS = ["viewMedicines"];

// volunteer/caretaker only: those two roles are invite-only (see auth.routes.js).
// elder/family are never set here - they self-register normally, before accepting.
const INVITE_ROLES = ["volunteer", "caretaker"];

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  relation: z.string().trim().optional(),
  permissions: z.array(z.enum(CARELINK_PERMISSIONS)).optional(),
  inviteRole: z.enum(INVITE_ROLES).optional(),
});

const acceptSchema = z.object({
  code: z.string().trim().min(6),
  // Only required when the accepting account doesn't exist yet (see the
  // accept route below); optional here so existing-account accepts can omit it.
  name: z.string().trim().min(1).optional(),
});

const linkUpdateSchema = z.object({
  permissions: z.array(z.enum(CARELINK_PERMISSIONS)).optional(),
  relation: z.string().trim().optional(),
});

function parseBody(schema, body, message) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed(message, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// Never includes inviteCodeHash (it is select:false and not copied here).
function toPublicCareLink(link) {
  return {
    id: String(link._id),
    elderId: String(link.elderId),
    userId: link.userId ? String(link.userId) : null,
    relation: link.relation,
    permissions: link.permissions,
    status: link.status,
    inviteEmail: link.inviteEmail,
  };
}

// deps is optional; tests pass fake models and fake authenticate/authorize deps.
export function createCareLinkRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const authDeps = deps.authDeps ?? {};
  const CareLinkModel = deps.CareLinkModel ?? CareLink;
  const ElderModel = deps.ElderModel ?? Elder;
  const UserModel = deps.UserModel ?? User;

  const router = Router();

  async function loadLink(id) {
    if (!mongoose.isValidObjectId(id)) throw ApiError.notFound("Care link not found");
    const link = await CareLinkModel.findById(id);
    if (!link) throw ApiError.notFound("Care link not found");
    return link;
  }

  router.post(
    "/elders/:elderId/care-links/invite",
    authenticate,
    requireUser,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const body = parseBody(inviteSchema, req.body, "Invalid invite data");

      const elder = await ElderModel.findById(req.params.elderId);
      if (!elder) throw ApiError.notFound("Elder not found");

      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

      const link = await CareLinkModel.create({
        elderId: elder._id,
        inviteEmail: body.email,
        relation: body.relation,
        permissions: body.permissions ?? DEFAULT_INVITE_PERMISSIONS,
        inviteRole: body.inviteRole,
        status: "pending",
        invitedBy: req.user._id,
        inviteCodeHash: hashInviteCode(code),
        inviteExpiresAt: expiresAt,
      });

      // The plain code is returned once here and never stored.
      res.status(201).json({
        invite: {
          id: String(link._id),
          code,
          expiresAt: link.inviteExpiresAt,
          inviteEmail: link.inviteEmail,
          permissions: link.permissions,
          inviteRole: link.inviteRole ?? null,
        },
      });
    }
  );

  // No requireUser here, deliberately: a brand-new Firebase sign-in with no
  // User yet must still be able to accept an invite that carries an
  // inviteRole (volunteer/caretaker), which creates their account below.
  router.post("/care-links/accept", authenticate, async (req, res) => {
    const body = parseBody(acceptSchema, req.body, "Invalid invite code");

    const link = await CareLinkModel.findOne({
      inviteCodeHash: hashInviteCode(body.code),
      status: "pending",
      inviteExpiresAt: { $gt: new Date() },
    }).select("+inviteCodeHash");
    if (!link) throw ApiError.notFound("Invite not found or expired");

    let user = req.user;
    if (!user) {
      if (!link.inviteRole) {
        // A family-to-family invite (no inviteRole): the invitee must
        // register normally first, since elder/family are not invite-only.
        throw ApiError.forbidden(
          "No account exists for this sign-in yet. Register via POST /auth/register first, then accept this invite."
        );
      }
      if (!body.name) {
        throw ApiError.validationFailed("name is required to create your account", {
          issues: [{ path: "name", message: "name is required" }],
        });
      }
      user = await UserModel.create({
        authUid: req.auth.uid,
        name: body.name,
        role: link.inviteRole,
      });
    }

    if (link.userId && String(link.userId) !== String(user._id)) {
      throw ApiError.conflict("Invite has already been accepted by another account");
    }

    // One link per user per elder (partial unique index). If this user already
    // has a link to the same elder, return it instead of creating a duplicate.
    const existing = await CareLinkModel.findOne({
      elderId: link.elderId,
      userId: user._id,
    });
    if (existing && String(existing._id) !== String(link._id)) {
      if (existing.status === "active") {
        res.json({ carelink: toPublicCareLink(existing), user: toPublicUser(user) });
        return;
      }
      throw ApiError.conflict("This account already has a revoked link to this elder");
    }

    link.userId = user._id;
    link.status = "active";
    link.inviteCodeHash = undefined;
    link.inviteExpiresAt = undefined;
    await link.save();

    res.json({ carelink: toPublicCareLink(link), user: toPublicUser(user) });
  });

  router.get(
    "/elders/:elderId/family",
    authenticate,
    requireUser,
    authorizeLinked(authDeps),
    async (req, res) => {
      const links = await CareLinkModel.find({
        elderId: req.params.elderId,
        status: { $in: ["pending", "active"] },
      })
        .sort({ createdAt: 1 })
        .lean();

      res.json({ members: links.map(toPublicCareLink) });
    }
  );

  router.patch("/care-links/:id", authenticate, requireUser, async (req, res) => {
    const body = parseBody(linkUpdateSchema, req.body, "Invalid care link data");
    const link = await loadLink(req.params.id);

    const allowed = await canAccessElder(req.user._id, link.elderId, "editProfile", authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    if (body.permissions !== undefined) link.permissions = body.permissions;
    if (body.relation !== undefined) link.relation = body.relation;
    await link.save();

    res.json({ carelink: toPublicCareLink(link) });
  });

  router.delete("/care-links/:id", authenticate, requireUser, async (req, res) => {
    const link = await loadLink(req.params.id);

    const isLinkedUser = Boolean(link.userId) && String(link.userId) === String(req.user._id);
    const isEditor =
      !isLinkedUser &&
      (await canAccessElder(req.user._id, link.elderId, "editProfile", authDeps));
    if (!isLinkedUser && !isEditor) {
      throw ApiError.forbidden("You do not have permission for this care link");
    }

    // Soft revoke: keep the row so history and the unique index stay intact.
    link.status = "revoked";
    await link.save();

    res.json({ carelink: toPublicCareLink(link) });
  });

  return router;
}

export default createCareLinkRouter();
