// Medicine and dose scheduling logic. Pure helpers plus DoseLog writes.
// No Express types in this file.

// All HH:mm times are India Standard Time, fixed offset, no DST.
export const IST_OFFSET = "+05:30";

const IST_SHIFT_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Build a Date for an IST wall-clock time on an IST calendar date.
export function buildScheduledAt(dateYmd, hhmm) {
  return new Date(`${dateYmd}T${hhmm}:00${IST_OFFSET}`);
}

// IST calendar date (YYYY-MM-DD) of an instant.
export function istDateOf(date) {
  return new Date(date.getTime() + IST_SHIFT_MS).toISOString().slice(0, 10);
}

// Start of an IST calendar day, and the start of the following day.
export function istDayRange(dateYmd) {
  const start = buildScheduledAt(dateYmd, "00:00");
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

// One Date per time in medicine.times, but only when dateYmd (IST) falls
// within startDate..endDate inclusive. A missing endDate is open-ended.
export function dosesForDate(medicine, dateYmd) {
  const startYmd = istDateOf(new Date(medicine.startDate));
  const endYmd = medicine.endDate ? istDateOf(new Date(medicine.endDate)) : null;

  if (dateYmd < startYmd) return [];
  if (endYmd && dateYmd > endYmd) return [];

  return medicine.times.map((hhmm) => buildScheduledAt(dateYmd, hhmm));
}

// Create pending DoseLog rows for the day. Existing rows are never changed.
export async function ensureDosesForDate(medicine, dateYmd, DoseLogModel) {
  for (const scheduledAt of dosesForDate(medicine, dateYmd)) {
    await DoseLogModel.updateOne(
      { medicineId: medicine._id, scheduledAt },
      {
        $setOnInsert: {
          medicineId: medicine._id,
          elderId: medicine.elderId,
          scheduledAt,
          status: "pending",
        },
      },
      { upsert: true }
    );
  }
}

// Mark a dose taken. Idempotent: an already-taken dose is returned as-is.
// Never edits the Medicine.
export async function markDoseTaken(dose, { reportedBy, source, now = new Date() }) {
  if (dose.status === "taken") return dose;

  dose.status = "taken";
  dose.takenAt = now;
  dose.reportedBy = reportedBy;
  dose.source = source;
  await dose.save();
  return dose;
}
