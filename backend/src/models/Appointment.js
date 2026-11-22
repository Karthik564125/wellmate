import mongoose from "mongoose";

export const APPOINTMENT_STATUSES = ["booked", "not-booked-yet", "completed"];

const appointmentSchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    title: { type: String },
    doctor: { type: String, required: true },
    place: { type: String, required: true },
    // Combines the visit's date and time into one real Date, instead of the
    // separate display strings the frontend's mock data used - "past" is
    // derived from this (see toPublicAppointment) rather than stored.
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "booked" },
    bookedBy: { type: String },
    cabBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export function toPublicAppointment(appointment) {
  return {
    id: String(appointment._id),
    elderId: String(appointment.elderId),
    title: appointment.title ?? "",
    doctor: appointment.doctor,
    place: appointment.place,
    scheduledAt: appointment.scheduledAt.toISOString(),
    status: appointment.status,
    bookedBy: appointment.bookedBy ?? null,
    cabBooked: Boolean(appointment.cabBooked),
    past: appointment.scheduledAt.getTime() < Date.now(),
  };
}

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
