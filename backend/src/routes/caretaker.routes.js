// GET /api/v1/elders/:elderId/caretakers
// GET/POST /api/v1/caretakers, PATCH/DELETE /api/v1/caretakers/:id
// POST /api/v1/elders/:elderId/caretaker-assignments, DELETE /api/v1/elders/:elderId/caretaker-assignments/:caretakerId

import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, canAccessElder } from "../middleware/authorize.js";
import CareAssignment from "../models/CareAssignment.js";
import CareLink from "../models/CareLink.js";
import Caretaker, { CARETAKER_SHIFT_DAYS, CARETAKER_STATUSES, toPublicCaretaker } from "../models/Caretaker.js";
import Elder from "../models/Elder.js";
import { ApiError } from "../utils/ApiError.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const caretakerFieldsSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  specialty: z.string().trim().optional(),
  status: z.enum(CARETAKER_STATUSES).optional(),
  shiftDays: z.array(z.enum(CARETAKER_SHIFT_DAYS)).min(1, "choose at least one shift day"),
  shiftStart: z.string().regex(TIME_PATTERN, "shiftStart must be HH:MM"),
  shiftEnd: z.string().regex(TIME_PATTERN, "shiftEnd must be HH:MM"),
  phone: z.string().trim().min(1, "phone is required"),
});

const createSchema = caretakerFieldsSchema;
const updateSchema = caretakerFieldsSchema.partial();

const assignmentSchema = z.object({
  caretakerId: z.string().refine((value) => mongoose.isValidObjectId(value), "caretakerId must be a valid id"),
});

function parseOr400(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed("Invalid caretaker data", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// "HH:MM" strings compare correctly as plain strings once both pass TIME_PATTERN.
function assertShiftOrder(shiftStart, shiftEnd) {
  if (shiftEnd <= shiftStart) {
    throw ApiError.validationFailed("Invalid caretaker data", {
      issues: [{ path: "shiftEnd", message: "shiftEnd must be after shiftStart" }],
    });
  }
}

// deps is optional; tests pass a fake authenticate and fake models.
export function createCaretakerRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const CaretakerModel = deps.CaretakerModel ?? Caretaker;
  const CareAssignmentModel = deps.CareAssignmentModel ?? CareAssignment;
  const CareLinkModel = deps.CareLinkModel ?? CareLink;
  const ElderModel = deps.ElderModel ?? Elder;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  // Attach each caretaker's assigned elder ids (from CareAssignment) to its public shape.
  async function toPublicCaretakers(caretakers) {
    const assignments = await CareAssignmentModel.find({
      caretakerId: { $in: caretakers.map((caretaker) => caretaker._id) },
    }).lean();
    return caretakers.map((caretaker) =>
      toPublicCaretaker(
        caretaker,
        assignments
          .filter((assignment) => String(assignment.caretakerId) === String(caretaker._id))
          .map((assignment) => assignment.elderId)
      )
    );
  }

  // Creating a caretaker needs editProfile on at least one elder: the signed-in
  // user owns an Elder, or holds an active CareLink with editProfile.
  async function canCreateCaretakers(user) {
    if (await ElderModel.exists({ userId: user._id })) return true;
    return Boolean(
      await CareLinkModel.exists({ userId: user._id, status: "active", permissions: "editProfile" })
    );
  }

  // Editing or deleting a caretaker needs either to have created it, or
  // editProfile on an elder this caretaker is assigned to.
  async function requireCaretakerEditAccess(user, caretakerId) {
    if (!mongoose.isValidObjectId(caretakerId)) throw ApiError.notFound("Caretaker not found");
    const caretaker = await CaretakerModel.findById(caretakerId);
    if (!caretaker) throw ApiError.notFound("Caretaker not found");

    if (caretaker.createdBy && String(caretaker.createdBy) === String(user._id)) return caretaker;

    const assignments = await CareAssignmentModel.find({ caretakerId: caretaker._id }).lean();
    for (const assignment of assignments) {
      if (await canAccessElder(user._id, assignment.elderId, "editProfile", authDeps)) return caretaker;
    }
    throw ApiError.forbidden("You do not have permission to change this caretaker");
  }

  router.get(
    "/elders/:elderId/caretakers",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      const assignments = await CareAssignmentModel.find({ elderId: req.params.elderId }).lean();
      const caretakers = await CaretakerModel.find({
        _id: { $in: assignments.map((assignment) => assignment.caretakerId) },
      }).sort({ name: 1 });
      res.json({ caretakers: await toPublicCaretakers(caretakers) });
    }
  );

  router.get("/caretakers", authenticate, async (req, res) => {
    const caretakers = await CaretakerModel.find().sort({ name: 1 });
    res.json({ caretakers: await toPublicCaretakers(caretakers) });
  });

  router.post("/caretakers", authenticate, requireUser, async (req, res) => {
    if (!(await canCreateCaretakers(req.user))) {
      throw ApiError.forbidden("Only family members or the elder can add caretakers");
    }
    const data = parseOr400(createSchema, req.body);
    assertShiftOrder(data.shiftStart, data.shiftEnd);
    // Set explicitly rather than relying on the schema defaults; see the matching note in appointment.routes.js.
    const caretaker = await CaretakerModel.create({
      ...data,
      specialty: data.specialty ?? "",
      status: data.status ?? "available",
      createdBy: req.user._id,
    });
    res.status(201).json({ caretaker: toPublicCaretaker(caretaker, []) });
  });

  router.patch("/caretakers/:id", authenticate, requireUser, async (req, res) => {
    const existing = await requireCaretakerEditAccess(req.user, req.params.id);
    const data = parseOr400(updateSchema, req.body);
    // A partial update may change only one end of the shift, so check against the stored value for the other.
    assertShiftOrder(data.shiftStart ?? existing.shiftStart, data.shiftEnd ?? existing.shiftEnd);
    const caretaker = await CaretakerModel.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );
    const [publicCaretaker] = await toPublicCaretakers([caretaker]);
    res.json({ caretaker: publicCaretaker });
  });

  router.delete("/caretakers/:id", authenticate, requireUser, async (req, res) => {
    await requireCaretakerEditAccess(req.user, req.params.id);
    await CareAssignmentModel.deleteMany({ caretakerId: req.params.id });
    await CaretakerModel.findByIdAndDelete(req.params.id);
    res.status(204).send();
  });

  router.post(
    "/elders/:elderId/caretaker-assignments",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const { caretakerId } = parseOr400(assignmentSchema, req.body);
      const caretaker = await CaretakerModel.findById(caretakerId);
      if (!caretaker) throw ApiError.notFound("Caretaker not found");

      const existing = await CareAssignmentModel.findOne({ elderId: req.params.elderId, caretakerId });
      if (existing) throw ApiError.conflict("This caretaker is already assigned to this elder");

      try {
        const assignment = await CareAssignmentModel.create({
          elderId: req.params.elderId,
          caretakerId,
          createdBy: req.user._id,
        });
        res.status(201).json({
          assignment: { elderId: String(assignment.elderId), caretakerId: String(assignment.caretakerId) },
        });
      } catch (err) {
        // A concurrent duplicate request can get past the findOne check and hit the unique index instead.
        if (err?.code === 11000) throw ApiError.conflict("This caretaker is already assigned to this elder");
        throw err;
      }
    }
  );

  router.delete(
    "/elders/:elderId/caretaker-assignments/:caretakerId",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.caretakerId)) throw ApiError.notFound("Assignment not found");
      const deleted = await CareAssignmentModel.findOneAndDelete({
        elderId: req.params.elderId,
        caretakerId: req.params.caretakerId,
      });
      if (!deleted) throw ApiError.notFound("Assignment not found");
      res.status(204).send();
    }
  );

  return router;
}

export default createCaretakerRouter();
