// GET/POST /api/v1/elders/:elderId/appointments
// PATCH/DELETE /api/v1/appointments/:id
// GET/POST /api/v1/appointments/demo, PATCH/DELETE /api/v1/appointments/demo/:id

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, authorizeSubresource } from "../middleware/authorize.js";
import Appointment, { APPOINTMENT_STATUSES, toPublicAppointment } from "../models/Appointment.js";
import Elder from "../models/Elder.js";
import { ApiError } from "../utils/ApiError.js";

// Reserved, well-known id for demo mode's one shared elder - a real
// MongoDB-backed Elder/Appointment set with no real account behind it, so
// every demo-mode profile view (family, elder, ...) reads/writes the same
// live data instead of each keeping its own disconnected local copy.
const DEMO_ELDER_ID = "000000000000000000000001";

function daysFromNow(days, hours, minutes) {
  const when = new Date();
  when.setDate(when.getDate() + days);
  when.setHours(hours, minutes, 0, 0);
  return when;
}

// Seeded once, the first time anything touches the demo elder - matches
// frontend/src/data/mockData.js's APPOINTMENTS so the demo looks the same
// as it always has, just backed by Mongo instead of local-only state.
const DEMO_SEED_APPOINTMENTS = [
  {
    title: "Eye check-up",
    doctor: "Dr. Sharma",
    place: "Sunrise Eye Clinic",
    scheduledAt: daysFromNow(2, 10, 30),
    status: "booked",
    bookedBy: "Ravi",
    cabBooked: true,
  },
  {
    title: "Cardiology follow-up",
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: daysFromNow(11, 10, 0),
    status: "not-booked-yet",
    bookedBy: null,
    cabBooked: false,
  },
  {
    title: "Diabetes review and HbA1c",
    doctor: "Dr. Iyer",
    place: "Care Hospital",
    scheduledAt: daysFromNow(18, 9, 0),
    status: "booked",
    bookedBy: "Anjali",
    cabBooked: false,
  },
];

// Idempotent: creates the demo elder and its seed appointments only the
// first time, no-ops on every later call.
async function ensureDemoElder(ElderModel, AppointmentModel) {
  const existing = await ElderModel.findById(DEMO_ELDER_ID);
  if (existing) return;

  await ElderModel.create({ _id: DEMO_ELDER_ID, displayName: "Lakshmi Devi" });
  // One at a time rather than Model.create([...]) - keeps this testable
  // against the same simple fake model every other route's tests use.
  for (const appt of DEMO_SEED_APPOINTMENTS) {
    await AppointmentModel.create({ elderId: DEMO_ELDER_ID, ...appt });
  }
}

const createSchema = z.object({
  title: z.string().optional(),
  doctor: z.string().trim().min(1, "doctor is required"),
  place: z.string().trim().min(1, "place is required"),
  scheduledAt: z.coerce.date({ invalid_type_error: "scheduledAt must be a valid date" }),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  bookedBy: z.string().optional(),
  cabBooked: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

function parseOr400(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed("Invalid appointment data", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// deps is optional; tests pass a fake authenticate, AppointmentModel, ElderModel and authDeps.
export function createAppointmentRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const AppointmentModel = deps.AppointmentModel ?? Appointment;
  const ElderModel = deps.ElderModel ?? Elder;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  router.get(
    "/elders/:elderId/appointments",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      const appointments = await AppointmentModel.find({ elderId: req.params.elderId }).sort({ scheduledAt: 1 });
      res.json({ appointments: appointments.map(toPublicAppointment) });
    }
  );

  router.post(
    "/elders/:elderId/appointments",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(createSchema, req.body);
      // Set explicitly rather than relying only on the schema's Mongoose
      // defaults: zod's .optional() can still produce an own `undefined`
      // key, which would otherwise overwrite the model's default on create.
      const appointment = await AppointmentModel.create({
        elderId: req.params.elderId,
        ...data,
        status: data.status ?? "booked",
        cabBooked: data.cabBooked ?? false,
      });
      res.status(201).json({ appointment: toPublicAppointment(appointment) });
    }
  );

  router.patch(
    "/appointments/:id",
    authenticate,
    authorizeSubresource(AppointmentModel, "editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(updateSchema, req.body);
      const appointment = await AppointmentModel.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
      );
      res.json({ appointment: toPublicAppointment(appointment) });
    }
  );

  router.delete(
    "/appointments/:id",
    authenticate,
    authorizeSubresource(AppointmentModel, "editProfile", authDeps),
    async (req, res) => {
      await AppointmentModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    }
  );

  // ---- Demo-only endpoints ----
  // No authenticate/authorize - demo mode has no real signed-in account.
  // Every request here is scoped to the one reserved DEMO_ELDER_ID, both to
  // seed/read it and (for writes) as a filter so a caller can never touch a
  // real account's appointment by guessing its id.
  router.get("/appointments/demo", async (req, res) => {
    await ensureDemoElder(ElderModel, AppointmentModel);
    const appointments = await AppointmentModel.find({ elderId: DEMO_ELDER_ID }).sort({ scheduledAt: 1 });
    res.json({ appointments: appointments.map(toPublicAppointment) });
  });

  router.post("/appointments/demo", async (req, res) => {
    await ensureDemoElder(ElderModel, AppointmentModel);
    const data = parseOr400(createSchema, req.body);
    const appointment = await AppointmentModel.create({
      elderId: DEMO_ELDER_ID,
      ...data,
      status: data.status ?? "booked",
      cabBooked: data.cabBooked ?? false,
    });
    res.status(201).json({ appointment: toPublicAppointment(appointment) });
  });

  router.patch("/appointments/demo/:id", async (req, res) => {
    const data = parseOr400(updateSchema, req.body);
    const appointment = await AppointmentModel.findOneAndUpdate(
      { _id: req.params.id, elderId: DEMO_ELDER_ID },
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );
    if (!appointment) throw ApiError.notFound("Appointment not found");
    res.json({ appointment: toPublicAppointment(appointment) });
  });

  router.delete("/appointments/demo/:id", async (req, res) => {
    const deleted = await AppointmentModel.findOneAndDelete({ _id: req.params.id, elderId: DEMO_ELDER_ID });
    if (!deleted) throw ApiError.notFound("Appointment not found");
    res.status(204).send();
  });

  return router;
}

export default createAppointmentRouter();
