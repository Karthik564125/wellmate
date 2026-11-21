// Medicines: GET/POST /elders/:elderId/medicines, PATCH/DELETE /medicines/:id
// Doses:     GET /elders/:elderId/doses?date=YYYY-MM-DD, POST /doses/:id/take

import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, canAccessElder } from "../middleware/authorize.js";
import DoseLog from "../models/DoseLog.js";
import Elder from "../models/Elder.js";
import Medicine from "../models/Medicine.js";
import {
  ensureDosesForDate,
  istDateOf,
  istDayRange,
  markDoseTaken,
} from "../services/medicine.service.js";
import { ApiError } from "../utils/ApiError.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const medicineCreateSchema = z.object({
  name: z.string().trim().min(1),
  dosage: z.string().optional(),
  form: z.string().optional(),
  times: z.array(z.string().regex(TIME_PATTERN)).min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  instructions: z.string().optional(),
});

const medicineUpdateSchema = medicineCreateSchema.partial();

function validationError(message, parsed) {
  return ApiError.validationFailed(message, {
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function assertEndNotBeforeStart(startDate, endDate) {
  if (startDate && endDate && endDate < startDate) {
    throw ApiError.validationFailed("endDate must not be before startDate", {
      issues: [{ path: "endDate", message: "endDate must not be before startDate" }],
    });
  }
}

function toPublicMedicine(medicine) {
  return {
    id: String(medicine._id),
    elderId: String(medicine.elderId),
    name: medicine.name,
    dosage: medicine.dosage,
    form: medicine.form,
    times: medicine.times,
    startDate: medicine.startDate,
    endDate: medicine.endDate,
    instructions: medicine.instructions,
    createdBy: medicine.createdBy ? String(medicine.createdBy) : undefined,
    createdAt: medicine.createdAt,
    updatedAt: medicine.updatedAt,
  };
}

function toPublicDose(dose, medicineName) {
  return {
    id: String(dose._id),
    medicineId: String(dose.medicineId),
    medicineName: medicineName ?? null,
    scheduledAt: dose.scheduledAt,
    status: dose.status,
    takenAt: dose.takenAt,
    reportedBy: dose.reportedBy,
    source: dose.source,
  };
}

// deps is optional; tests pass fake models and fake authorize/authenticate deps.
export function createMedicineRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const authDeps = deps.authDeps ?? {};
  const MedicineModel = deps.MedicineModel ?? Medicine;
  const DoseLogModel = deps.DoseLogModel ?? DoseLog;
  const ElderModel = deps.ElderModel ?? Elder;

  const router = Router();

  // Loads a medicine by :id and checks editProfile on its elder.
  async function loadEditableMedicine(req) {
    if (!req.user) {
      throw ApiError.unauthenticated("No user profile exists for this account");
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw ApiError.notFound("Medicine not found");
    }
    const medicine = await MedicineModel.findById(req.params.id);
    if (!medicine) throw ApiError.notFound("Medicine not found");

    const allowed = await canAccessElder(
      req.user._id,
      medicine.elderId,
      "editProfile",
      authDeps
    );
    if (!allowed) {
      throw ApiError.forbidden("You do not have permission for this elder");
    }
    return medicine;
  }

  router.get(
    "/elders/:elderId/medicines",
    authenticate,
    authorize("viewMedicines", authDeps),
    async (req, res) => {
      const medicines = await MedicineModel.find({ elderId: req.params.elderId }).sort({
        createdAt: 1,
      });
      res.json({ medicines: medicines.map(toPublicMedicine) });
    }
  );

  router.post(
    "/elders/:elderId/medicines",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const parsed = medicineCreateSchema.safeParse(req.body ?? {});
      if (!parsed.success) throw validationError("Invalid medicine data", parsed);

      assertEndNotBeforeStart(parsed.data.startDate, parsed.data.endDate);

      const medicine = await MedicineModel.create({
        ...parsed.data,
        elderId: req.params.elderId,
        createdBy: req.user._id,
      });
      res.status(201).json({ medicine: toPublicMedicine(medicine) });
    }
  );

  router.patch("/medicines/:id", authenticate, async (req, res) => {
    const medicine = await loadEditableMedicine(req);

    const parsed = medicineUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw validationError("Invalid medicine data", parsed);

    const startDate = parsed.data.startDate ?? medicine.startDate;
    const endDate = parsed.data.endDate ?? medicine.endDate;
    assertEndNotBeforeStart(startDate, endDate);

    Object.assign(medicine, parsed.data);
    await medicine.save();
    res.json({ medicine: toPublicMedicine(medicine) });
  });

  router.delete("/medicines/:id", authenticate, async (req, res) => {
    const medicine = await loadEditableMedicine(req);

    await MedicineModel.deleteOne({ _id: medicine._id });
    await DoseLogModel.deleteMany({ medicineId: medicine._id });
    res.json({ deleted: true });
  });

  router.get(
    "/elders/:elderId/doses",
    authenticate,
    authorize("viewMedicines", authDeps),
    async (req, res) => {
      const requested = req.query.date;
      if (requested !== undefined && (typeof requested !== "string" || !DATE_PATTERN.test(requested))) {
        throw ApiError.validationFailed("date must be YYYY-MM-DD", {
          issues: [{ path: "date", message: "date must be YYYY-MM-DD" }],
        });
      }
      const date = requested ?? istDateOf(new Date());

      const medicines = await MedicineModel.find({ elderId: req.params.elderId });
      for (const medicine of medicines) {
        await ensureDosesForDate(medicine, date, DoseLogModel);
      }

      const { start, end } = istDayRange(date);
      const doses = await DoseLogModel.find({
        elderId: req.params.elderId,
        scheduledAt: { $gte: start, $lt: end },
      }).sort({ scheduledAt: 1 });

      const names = new Map(medicines.map((m) => [String(m._id), m.name]));
      res.json({
        date,
        doses: doses.map((dose) => toPublicDose(dose, names.get(String(dose.medicineId)))),
      });
    }
  );

  router.post("/doses/:id/take", authenticate, async (req, res) => {
    if (!req.user) {
      throw ApiError.unauthenticated("No user profile exists for this account");
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw ApiError.notFound("Dose not found");
    }
    const dose = await DoseLogModel.findById(req.params.id);
    if (!dose) throw ApiError.notFound("Dose not found");

    const isElder = Boolean(
      await ElderModel.findOne({ _id: dose.elderId, userId: req.user._id })
    );
    const allowed =
      isElder ||
      (await canAccessElder(req.user._id, dose.elderId, "viewMedicines", authDeps));
    if (!allowed) {
      throw ApiError.forbidden("You do not have permission for this elder");
    }

    const updated = await markDoseTaken(dose, {
      reportedBy: isElder ? "elder" : "family",
      source: "manual",
    });
    res.json({ dose: toPublicDose(updated) });
  });

  return router;
}

export default createMedicineRouter();
