import mongoose from "mongoose";

export const REQUEST_TYPES = [
  "medicine_pending",
  "talk_family",
  "call_doctor",
  "grocery",
  "recharge",
  "transport",
  "sos",
  "other",
];
export const REQUEST_STATUSES = ["new", "waiting_family", "accepted", "done", "cancelled"];
export const REQUEST_SOURCES = ["chitti", "manual"];

// A request an elder makes (or an SOS) that family/caretakers act on.
// The Elder model is referenced by name; Conversation does not exist yet, so
// conversationId is a plain ObjectId with no ref.
const careRequestSchema = new mongoose.Schema(
  {
    elderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Elder",
      required: true,
      index: true,
    },
    conversationId: { type: mongoose.Schema.Types.ObjectId },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: REQUEST_TYPES, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: REQUEST_STATUSES, default: "new" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: REQUEST_SOURCES, default: "manual" },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

careRequestSchema.index({ elderId: 1, status: 1, createdAt: -1 });

const CareRequest = mongoose.model("CareRequest", careRequestSchema);

export default CareRequest;
