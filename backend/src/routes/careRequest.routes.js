// Care requests, SOS and alerts.
// GET  /api/v1/requests
// POST /api/v1/requests
// PATCH /api/v1/requests/:id
// POST /api/v1/requests/:id/ack
// POST /api/v1/elders/:elderId/sos
// GET  /api/v1/elders/:elderId/alerts

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import { canAccessElder } from "../middleware/authorize.js";
import Alert from "../models/Alert.js";
import CareLink from "../models/CareLink.js";
import CareRequest, { REQUEST_STATUSES, REQUEST_TYPES } from "../models/CareRequest.js";
import Elder from "../models/Elder.js";
import {
  canTransition,
  createRequestWithAlert,
  noopNotifier,
} from "../services/careRequest.service.js";
import { ApiError } from "../utils/ApiError.js";

// SOS has its own endpoint, so manual requests cannot use the "sos" type.
const MANUAL_REQUEST_TYPES = REQUEST_TYPES.filter((type) => type !== "sos");
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
const DEFAULT_ALERT_LIMIT = 50;
const MAX_ALERT_LIMIT = 200;

const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, "Invalid id");

const requestListQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
});

const createRequestSchema = z.object({
  elderId: objectIdSchema,
  type: z.enum(MANUAL_REQUEST_TYPES),
  details: z.record(z.string(), z.unknown()).optional(),
});

const requestUpdateSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  assignedTo: objectIdSchema.optional(),
});

const sosSchema = z.object({
  details: z.record(z.string(), z.unknown()).optional(),
});

const alertListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_ALERT_LIMIT).default(DEFAULT_ALERT_LIMIT),
});

function parseInput(schema, input, message) {
  const parsed = schema.safeParse(input ?? {});
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

// deps is optional; tests pass fake models, a fake notifier and fake authenticate/authorize deps.
export function createCareRequestRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const authDeps = deps.authDeps ?? {};
  const CareRequestModel = deps.CareRequestModel ?? CareRequest;
  const AlertModel = deps.AlertModel ?? Alert;
  const ElderModel = deps.ElderModel ?? Elder;
  const CareLinkModel = deps.CareLinkModel ?? CareLink;
  const notifier = deps.notifier ?? noopNotifier;

  const router = Router();

  async function loadRequest(id) {
    if (!OBJECT_ID_PATTERN.test(id)) throw ApiError.notFound("Request not found");
    const request = await CareRequestModel.findById(id);
    if (!request) throw ApiError.notFound("Request not found");
    return request;
  }

  router.get("/requests", authenticate, requireUser, async (req, res) => {
    const query = parseInput(requestListQuerySchema, req.query, "Invalid request filter");

    // Owner: requests the caller made for the elder(s) they own.
    // Linked users: requests for elders where they hold an active manageRequests link.
    const ownedElders = await ElderModel.find({ userId: req.user._id }).select("_id").lean();
    const ownedIds = ownedElders.map((elder) => elder._id);

    const links = await CareLinkModel.find({
      userId: req.user._id,
      status: "active",
      permissions: "manageRequests",
    })
      .select("elderId")
      .lean();
    const linkedIds = links.map((link) => link.elderId);

    const scope = [];
    if (ownedIds.length > 0) {
      scope.push({ elderId: { $in: ownedIds }, requestedBy: req.user._id });
    }
    if (linkedIds.length > 0) {
      scope.push({ elderId: { $in: linkedIds } });
    }
    if (scope.length === 0) {
      res.json({ requests: [] });
      return;
    }

    const filter = { $or: scope };
    if (query.status) filter.status = query.status;

    const requests = await CareRequestModel.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ requests });
  });

  router.post("/requests", authenticate, requireUser, async (req, res) => {
    const body = parseInput(createRequestSchema, req.body, "Invalid request data");

    const allowed = await canAccessElder(req.user._id, body.elderId, "manageRequests", authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    const { request, alert } = await createRequestWithAlert({
      elderId: body.elderId,
      requestedBy: req.user._id,
      type: body.type,
      details: body.details ?? {},
      source: "manual",
      notifier,
      CareRequestModel,
      AlertModel,
    });

    res.status(201).json({ request, alert });
  });

  router.patch("/requests/:id", authenticate, requireUser, async (req, res) => {
    const body = parseInput(requestUpdateSchema, req.body, "Invalid request update");
    const request = await loadRequest(req.params.id);

    const allowed = await canAccessElder(
      req.user._id,
      request.elderId,
      "manageRequests",
      authDeps
    );
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    if (!canTransition(request.status, body.status)) {
      throw ApiError.validationFailed("Invalid status transition", {
        from: request.status,
        to: body.status,
      });
    }

    request.status = body.status;
    if (body.assignedTo !== undefined) request.assignedTo = body.assignedTo;
    await request.save();

    res.json({ request });
  });

  router.post("/requests/:id/ack", authenticate, requireUser, async (req, res) => {
    const request = await loadRequest(req.params.id);

    const allowed = await canAccessElder(
      req.user._id,
      request.elderId,
      "receiveAlerts",
      authDeps
    );
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    let current = request;
    // Idempotent: only a waiting SOS moves to accepted. Anything else returns as-is.
    if (
      request.type === "sos" &&
      request.status === "waiting_family" &&
      canTransition(request.status, "accepted")
    ) {
      // Conditional update so only one acknowledgement wins the transition.
      const accepted = await CareRequestModel.findOneAndUpdate(
        { _id: request._id, status: "waiting_family" },
        { $set: { status: "accepted" } },
        { returnDocument: "after" }
      );
      if (accepted) {
        current = accepted;
        await AlertModel.updateOne(
          { requestId: request._id, type: "sos", acknowledgedAt: { $exists: false } },
          { $set: { acknowledgedBy: req.user._id, acknowledgedAt: new Date() } }
        );
        // TODO notify the elder that the SOS was acknowledged (notifier hook, not wired yet).
      }
    }

    res.json({ request: current });
  });

  router.post("/elders/:elderId/sos", authenticate, requireUser, async (req, res) => {
    const body = parseInput(sosSchema, req.body, "Invalid SOS data");

    // Any active link (or the elder themself) may raise an SOS.
    const allowed = await canAccessElder(req.user._id, req.params.elderId, null, authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    // The request and alert are saved before the notifier runs. A notifier
    // failure is logged inside the service and never fails this response.
    const { request, alert } = await createRequestWithAlert({
      elderId: req.params.elderId,
      requestedBy: req.user._id,
      type: "sos",
      details: body.details ?? {},
      source: "manual",
      notifier,
      CareRequestModel,
      AlertModel,
    });

    res.status(201).json({ request, alert });
  });

  router.get("/elders/:elderId/alerts", authenticate, requireUser, async (req, res) => {
    const query = parseInput(alertListQuerySchema, req.query, "Invalid alert filter");

    const allowed = await canAccessElder(req.user._id, req.params.elderId, null, authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    const alerts = await AlertModel.find({ elderId: req.params.elderId })
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean();

    res.json({ alerts });
  });

  return router;
}

export default createCareRequestRouter();
