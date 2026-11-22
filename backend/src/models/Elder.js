import mongoose from "mongoose";

export const ELDER_GENDERS = ["male", "female", "other"];
export const PREFERRED_LANGUAGES = ["te", "en"];

const elderSchema = new mongoose.Schema(
  {
    // Optional: an elder who has no account of their own (family manages
    // everything on their behalf) still gets an Elder document, just with
    // no userId.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    displayName: { type: String, required: true },
    // Collected so the elder can later be invited to sign up for their own
    // account (not wired yet - see createElderSchema in elder.routes.js).
    email: { type: String, lowercase: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ELDER_GENDERS },
    bloodGroup: { type: String },
    allergies: { type: [String], default: [] },
    address: { type: String },
    area: { type: String },
    photoUrl: { type: String },
    preferredLanguage: { type: String, enum: PREFERRED_LANGUAGES, default: "te" },
  },
  { timestamps: true }
);

// Safe shape for responses.
export function toPublicElder(elder) {
  return {
    id: String(elder._id),
    displayName: elder.displayName,
    email: elder.email ?? null,
    dateOfBirth: elder.dateOfBirth,
    gender: elder.gender,
    bloodGroup: elder.bloodGroup,
    allergies: elder.allergies ?? [],
    address: elder.address,
    area: elder.area,
    photoUrl: elder.photoUrl,
    preferredLanguage: elder.preferredLanguage,
  };
}

const Elder = mongoose.model("Elder", elderSchema);

export default Elder;
