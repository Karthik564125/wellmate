// GET/POST /api/v1/elders/:elderId/doctors
// PATCH/DELETE /api/v1/doctors/:id

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, authorizeSubresource } from "../middleware/authorize.js";
import Doctor, { toPublicDoctor } from "../models/Doctor.js";
import { ApiError } from "../utils/ApiError.js";

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  clinicLocation: z.string().optional(),
  availability: z.string().optional(),
});

const updateSchema = createSchema.partial();

function parseOr400(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed("Invalid doctor data", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// deps is optional; tests pass a fake authenticate, DoctorModel and authDeps.
export function createDoctorRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const DoctorModel = deps.DoctorModel ?? Doctor;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  router.get(
    "/elders/:elderId/doctors",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      const doctors = await DoctorModel.find({ elderId: req.params.elderId });
      res.json({ doctors: doctors.map(toPublicDoctor) });
    }
  );

  router.post(
    "/elders/:elderId/doctors",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(createSchema, req.body);
      const doctor = await DoctorModel.create({ elderId: req.params.elderId, ...data });
      res.status(201).json({ doctor: toPublicDoctor(doctor) });
    }
  );

  router.patch(
    "/doctors/:id",
    authenticate,
    authorizeSubresource(DoctorModel, "editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(updateSchema, req.body);
      const doctor = await DoctorModel.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { new: true, runValidators: true }
      );
      res.json({ doctor: toPublicDoctor(doctor) });
    }
  );

  router.delete(
    "/doctors/:id",
    authenticate,
    authorizeSubresource(DoctorModel, "editProfile", authDeps),
    async (req, res) => {
      await DoctorModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    }
  );

  return router;
}

export default createDoctorRouter();
