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
