import mongoose from "mongoose";

const conditionSchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    name: { type: String, required: true },
    sinceYear: { type: Number },
    status: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export function toPublicCondition(condition) {
  return {
    id: String(condition._id),
    elderId: String(condition.elderId),
    name: condition.name,
    sinceYear: condition.sinceYear,
    status: condition.status,
    notes: condition.notes,
  };
}

const Condition = mongoose.model("Condition", conditionSchema);

export default Condition;
