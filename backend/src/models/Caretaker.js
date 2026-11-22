import mongoose from "mongoose";

export const CARETAKER_STATUSES = ["available", "busy", "off-duty"];
export const CARETAKER_SHIFT_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// A caretaker is a profile record, not a user account: nobody signs in as one.
// One caretaker can serve many elders (see CareAssignment).
const caretakerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    specialty: { type: String, trim: true, default: "" },
    status: { type: String, enum: CARETAKER_STATUSES, default: "available" },
    shiftDays: {
      type: [{ type: String, enum: CARETAKER_SHIFT_DAYS }],
      validate: {
        validator: (days) => Array.isArray(days) && days.length > 0,
        message: "shiftDays must include at least one day",
      },
    },
    // "HH:MM", 24-hour, zero-padded so the strings compare correctly.
    shiftStart: { type: String, required: true },
    shiftEnd: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Safe shape for responses. assignedElderIds comes from CareAssignment, so the caller passes it in.
export function toPublicCaretaker(caretaker, assignedElderIds = []) {
  return {
    id: String(caretaker._id),
    name: caretaker.name,
    specialty: caretaker.specialty ?? "",
    status: caretaker.status,
    shiftDays: caretaker.shiftDays ?? [],
    shiftStart: caretaker.shiftStart,
    shiftEnd: caretaker.shiftEnd,
    phone: caretaker.phone,
    assignedElderIds: assignedElderIds.map(String),
  };
}

const Caretaker = mongoose.model("Caretaker", caretakerSchema);

export default Caretaker;
