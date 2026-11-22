// Notifications for the signed-in user.
// GET   /api/v1/notifications
// PATCH /api/v1/notifications/:id/read

import mongoose from "mongoose";
import { Router } from "express";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import Notification from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";

function toPublicNotification(n) {
  return {
    id: String(n._id),
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
  };
}

// deps is optional; tests pass a fake authenticate and fake models.
export function createNotificationRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const NotificationModel = deps.NotificationModel ?? Notification;

  const router = Router();

  router.get("/notifications", authenticate, requireUser, async (req, res) => {
    const items = await NotificationModel.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ notifications: items.map(toPublicNotification) });
  });

  router.patch("/notifications/:id/read", authenticate, requireUser, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw ApiError.notFound("Notification not found");
    }

    // Scoped to the caller: someone else's notification looks like a missing one.
    const item = await NotificationModel.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) throw ApiError.notFound("Notification not found");

    item.read = true;
    await item.save();

    res.json({ notification: toPublicNotification(item) });
  });

  return router;
}

export default createNotificationRouter();
