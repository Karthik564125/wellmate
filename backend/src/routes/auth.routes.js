// POST /api/v1/auth/register: create the User profile for the verified Firebase account.

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import User, { toPublicUser } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

const registerSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  // Only elder/family can self-register. volunteer/caretaker are invite-only:
  // their account is created automatically on /care-links/accept, carrying
  // the role from the invite (see careLink.routes.js). "admin" is in the
  // enum so the request reaches the explicit 403 check below instead of
  // failing validation with a less clear message.
  role: z.enum(["elder", "family", "admin"]),
  preferredLanguage: z.enum(["te", "en"]).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

// deps is optional; tests pass a fake authenticate and a fake UserModel.
export function createAuthRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const UserModel = deps.UserModel ?? User;

  const router = Router();

  router.post("/register", authenticate, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw ApiError.validationFailed("Invalid registration data", {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    const data = parsed.data;

    if (data.role === "admin") {
      throw ApiError.forbidden("Admin accounts cannot be self-registered");
    }

    if (req.user) {
      throw ApiError.conflict("A user profile already exists for this account");
    }

    // authUid comes from the verified token only, never from the body.
    let user;
    try {
      user = await UserModel.create({
        authUid: req.auth.uid,
        name: data.name,
        role: data.role,
        preferredLanguage: data.preferredLanguage,
        phone: data.phone,
        email: data.email,
      });
    } catch (err) {
      // Duplicate authUid from a concurrent register request.
      if (err?.code === 11000) {
        throw ApiError.conflict("A user profile already exists for this account");
      }
      throw err;
    }

    res.status(201).json({ user: toPublicUser(user) });
  });

  return router;
}

export default createAuthRouter();
