// Care request rules: status transitions and creating a request with its alert.
// No Express types here; routes translate errors into ApiError.

export const REQUEST_STATUS_TRANSITIONS = {
  new: ["waiting_family", "accepted", "cancelled"],
  waiting_family: ["accepted", "done", "cancelled"],
  accepted: ["done", "cancelled"],
  done: [],
  cancelled: [],
};

export function canTransition(from, to) {
  if (!Object.hasOwn(REQUEST_STATUS_TRANSITIONS, from)) return false;
  return REQUEST_STATUS_TRANSITIONS[from].includes(to);
}

// TODO wire Resend email and Socket.IO here later.
// Until then the notifier is a no-op; routes can inject a real one.
export const noopNotifier = {
  onRequestCreated: async () => {},
  onAlertCreated: async () => {},
};

// Saves the request first, then the alert. The notifier runs only after both
// rows are saved, and its failures are logged, never thrown or rolled back.
export async function createRequestWithAlert({
  elderId,
  requestedBy,
  type,
  details = {},
  source = "manual",
  notifier = noopNotifier,
  CareRequestModel,
  AlertModel,
}) {
  const isSos = type === "sos";

  const request = await CareRequestModel.create({
    elderId,
    requestedBy,
    type,
    details,
    source,
    status: isSos ? "waiting_family" : "new",
  });

  const alert = await AlertModel.create({
    elderId,
    type: isSos ? "sos" : "request",
    severity: isSos ? "high" : "normal",
    requestId: request._id,
  });

  try {
    await notifier.onRequestCreated(request);
  } catch (err) {
    console.error("[careRequest] notifier.onRequestCreated failed:", err?.message ?? err);
  }

  return { request, alert };
}
