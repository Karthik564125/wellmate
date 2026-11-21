import mongoose from "mongoose";

const emergencyContactSchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    name: { type: String, required: true },
    relation: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    // 1 = first to call. Lower number = higher priority.
    priority: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

export function toPublicEmergencyContact(contact) {
  return {
    id: String(contact._id),
    elderId: String(contact.elderId),
    name: contact.name,
    relation: contact.relation,
    phone: contact.phone,
    email: contact.email,
    priority: contact.priority,
  };
}

const EmergencyContact = mongoose.model("EmergencyContact", emergencyContactSchema);

export default EmergencyContact;
