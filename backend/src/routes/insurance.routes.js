// GET/POST /api/v1/elders/:elderId/insurance (list masks policyNumber)
// PATCH/DELETE /api/v1/insurance/:id

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, authorizeSubresource } from "../middleware/authorize.js";
import InsurancePolicy, {
  toPublicInsurance,
  toPublicInsuranceMasked,
} from "../models/InsurancePolicy.js";
import { ApiError } from "../utils/ApiError.js";

const createSchema = z.object({
  provider: z.string().trim().min(1, "provider is required"),
  policyType: z.string().optional(),
  policyNumber: z.string().trim().min(1, "policyNumber is required"),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  sumInsured: z.coerce.number().optional(),
  coverageItems: z.array(z.string()).optional(),
  exclusions: z.string().optional(),
  helplineNumber: z.string().optional(),
  cardImageUrl: z.string().optional(),
});

const updateSchema = createSchema.partial();

function parseOr400(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed("Invalid insurance data", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// deps is optional; tests pass a fake authenticate, InsuranceModel and authDeps.
export function createInsuranceRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const InsuranceModel = deps.InsuranceModel ?? InsurancePolicy;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  router.get(
    "/elders/:elderId/insurance",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      const policies = await InsuranceModel.find({ elderId: req.params.elderId });
      // policyNumber masked: a list is the easy way for a casual viewer to see
      // it, so the full number never appears here, only on a direct create/update.
      res.json({ insurance: policies.map(toPublicInsuranceMasked) });
    }
  );

  router.post(
    "/elders/:elderId/insurance",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(createSchema, req.body);
      const policy = await InsuranceModel.create({ elderId: req.params.elderId, ...data });
      res.status(201).json({ insurance: toPublicInsurance(policy) });
    }
  );

  router.patch(
    "/insurance/:id",
    authenticate,
    authorizeSubresource(InsuranceModel, "editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(updateSchema, req.body);
      const policy = await InsuranceModel.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
      );
      res.json({ insurance: toPublicInsurance(policy) });
    }
  );

  router.delete(
    "/insurance/:id",
    authenticate,
    authorizeSubresource(InsuranceModel, "editProfile", authDeps),
    async (req, res) => {
      await InsuranceModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    }
  );

  return router;
}

export default createInsuranceRouter();
