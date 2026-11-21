import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    name: { type: String, required: true },
    specialty: { type: String },
    phone: { type: String },
    clinicLocation: { type: String },
    availability: { type: String },
  },
  { timestamps: true }
);

export function toPublicDoctor(doctor) {
  return {
    id: String(doctor._id),
    elderId: String(doctor.elderId),
    name: doctor.name,
    specialty: doctor.specialty,
    phone: doctor.phone,
    clinicLocation: doctor.clinicLocation,
    availability: doctor.availability,
  };
}

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
