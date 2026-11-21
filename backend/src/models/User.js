import mongoose from "mongoose";

export const USER_ROLES = ["elder", "family", "volunteer", "admin", "caretaker"];
export const PREFERRED_LANGUAGES = ["te", "en"];

const userSchema = new mongoose.Schema(
  {
    authUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    role: { type: String, enum: USER_ROLES, required: true },
    preferredLanguage: { type: String, enum: PREFERRED_LANGUAGES, default: "te" },
  },
  { timestamps: true }
);

// Safe shape for responses. Never includes authUid.
export function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
  };
}

const User = mongoose.model("User", userSchema);

export default User;
