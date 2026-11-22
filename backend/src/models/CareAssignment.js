import mongoose from "mongoose";

// Links a caretaker to an elder. An elder may have zero or many caretakers,
// and a caretaker may serve many elders.
const careAssignmentSchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: "Caretaker", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One caretaker can be assigned to a given elder only once.
careAssignmentSchema.index({ elderId: 1, caretakerId: 1 }, { unique: true });

const CareAssignment = mongoose.model("CareAssignment", careAssignmentSchema);

export default CareAssignment;
