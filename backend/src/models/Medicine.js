import mongoose from "mongoose";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const medicineSchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true, index: true },
    name: { type: String, required: true, trim: true },
    dosage: { type: String },
    form: { type: String },
    times: {
      type: [{ type: String, match: TIME_PATTERN }],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: "At least one time is required" },
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    instructions: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Medicine = mongoose.model("Medicine", medicineSchema);

export default Medicine;
