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
  // Not required: a pending invite has no user until it is accepted.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  inviteEmail: { type: String, lowercase: true, trim: true },
  // SHA-256 hash of the invite code; the plain code is never stored.
  inviteCodeHash: { type: String, select: false },
  inviteExpiresAt: { type: Date },
  relation: { type: String },
  permissions: {
    type: [{ type: String, enum: CARELINK_PERMISSIONS }],
    default: [],
  },
  status: { type: String, enum: CARELINK_STATUSES, default: "pending" },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

// Partial: only links with a user are unique per elder, so an elder can have
// several pending invites at once.
careLinkSchema.index(
  { elderId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

const CareLink = mongoose.model("CareLink", careLinkSchema);

export default CareLink;
