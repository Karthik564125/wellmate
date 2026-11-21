// GET/POST /api/v1/elders/:elderId/conditions
// PATCH/DELETE /api/v1/conditions/:id

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, authorizeSubresource } from "../middleware/authorize.js";
import Condition, { toPublicCondition } from "../models/Condition.js";
import { ApiError } from "../utils/ApiError.js";

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  sinceYear: z.coerce.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

function parseOr400(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed("Invalid condition data", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// deps is optional; tests pass a fake authenticate, ConditionModel and authDeps.
export function createConditionRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const ConditionModel = deps.ConditionModel ?? Condition;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  router.get(
    "/elders/:elderId/conditions",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      const conditions = await ConditionModel.find({ elderId: req.params.elderId });
      res.json({ conditions: conditions.map(toPublicCondition) });
    }
  );

  router.post(
    "/elders/:elderId/conditions",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(createSchema, req.body);
      const condition = await ConditionModel.create({ elderId: req.params.elderId, ...data });
      res.status(201).json({ condition: toPublicCondition(condition) });
    }
  );

  router.patch(
    "/conditions/:id",
    authenticate,
    authorizeSubresource(ConditionModel, "editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(updateSchema, req.body);
      const condition = await ConditionModel.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
      );
      res.json({ condition: toPublicCondition(condition) });
    }
  );

  router.delete(
    "/conditions/:id",
    authenticate,
    authorizeSubresource(ConditionModel, "editProfile", authDeps),
    async (req, res) => {
      await ConditionModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    }
  );

  return router;
}

export default createConditionRouter();
