import mongoose from "mongoose";

// A message shown to one user (e.g. "You were added as a family member to ...").
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, default: "family_added" },
    message: { type: String, required: true },
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
