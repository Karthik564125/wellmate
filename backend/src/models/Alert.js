import mongoose from "mongoose";

export const ALERT_TYPES = ["request", "sos", "missed_dose"];
export const ALERT_SEVERITIES = ["normal", "high"];

// A notification row for family/caretakers. An SOS alert is open until a
// family member acknowledges it (acknowledgedAt is set).
const alertSchema = new mongoose.Schema(
  {
    elderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Elder",
      required: true,
      index: true,
    },
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, default: "normal" },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "CareRequest" },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

alertSchema.index({ elderId: 1, createdAt: -1 });

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
