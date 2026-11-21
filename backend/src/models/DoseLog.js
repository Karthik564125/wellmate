import mongoose from "mongoose";

const doseLogSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "taken", "missed", "skipped"], default: "pending" },
    takenAt: { type: Date },
    reportedBy: { type: String, enum: ["elder", "family", "voice"] },
    source: { type: String, enum: ["manual", "voice"] },
  },
  { timestamps: true }
);

doseLogSchema.index({ medicineId: 1, scheduledAt: 1 }, { unique: true });
doseLogSchema.index({ elderId: 1, scheduledAt: 1 });

const DoseLog = mongoose.model("DoseLog", doseLogSchema);

export default DoseLog;
