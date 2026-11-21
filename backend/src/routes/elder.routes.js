// GET/PUT /api/v1/elders/:elderId/profile

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, authorizeLinked } from "../middleware/authorize.js";
import Elder, { ELDER_GENDERS, PREFERRED_LANGUAGES, toPublicElder } from "../models/Elder.js";
import { ApiError } from "../utils/ApiError.js";

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

// deps is optional; tests pass a fake ElderModel and fake authorize/authenticate deps.
export function createElderRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const ElderModel = deps.ElderModel ?? Elder;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

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
        { new: true, runValidators: true }
      );
      if (!elder) throw ApiError.notFound("Elder not found");

      res.json({ elder: toPublicElder(elder) });
    }
  );

  return router;
}

export default createElderRouter();
