import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

const MONGOOSE_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    db: MONGOOSE_STATES[mongoose.connection.readyState] ?? "unknown",
  });
});

export default router;
