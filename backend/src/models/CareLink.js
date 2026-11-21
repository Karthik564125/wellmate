import mongoose from "mongoose";

export const CARELINK_PERMISSIONS = [
  "viewMedicines",
  "receiveAlerts",
  "editProfile",
  "manageRequests",
  "manageTasks",
];
export const CARELINK_STATUSES = ["pending", "active", "revoked"];

// Links a User (family, volunteer, caretaker, ...) to an elder.
// The Elder model does not exist yet; "Elder" is only a ref name.
const careLinkSchema = new mongoose.Schema({
  elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  relation: { type: String },
  permissions: {
    type: [{ type: String, enum: CARELINK_PERMISSIONS }],
    default: [],
  },
  status: { type: String, enum: CARELINK_STATUSES, default: "pending" },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

careLinkSchema.index({ elderId: 1, userId: 1 }, { unique: true });

const CareLink = mongoose.model("CareLink", careLinkSchema);

export default CareLink;
