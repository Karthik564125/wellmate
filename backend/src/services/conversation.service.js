// Chitti conversation state machine. No Express types here; routes
// translate errors into ApiError. This is where the actual decisions live
// (follow-up vs confirmation vs completed) - routes stay thin wiring.
//
// The LLM (ai.service.js) never touches the database and never decides
// permissions. It only ever returns details; this file is what actually
// writes CareRequest/Alert/DoseLog rows, after the caller's permission has
// already been checked by the route.

import {
  MAX_FOLLOW_UP_QUESTIONS,
  OPEN_CONVERSATION_STATUSES,
  newExpiry,
} from "../models/Conversation.js";
import { istDateOf, istDayRange, markDoseTaken } from "./medicine.service.js";
import { createRequestWithAlert, noopNotifier } from "./careRequest.service.js";
import { detectMedicinePending, detectSOS, detectYesNoCancel } from "./keyword.service.js";

// Below this, the LLM's own guess is not trusted as an action - the elder is
// asked to repeat instead (per the plan: "confidence below a threshold...
// becomes a clarification question, not an action").
const CONFIDENCE_THRESHOLD = 0.6;

// Intents that resolve immediately with no CareRequest/Alert: either a plain
// read-only answer, or (medicine_taken) a direct DoseLog write. Everything
// else that reaches confirmation creates a CareRequest of the same name as
// the intent (the two enums are kept in sync on purpose).
const NO_CONFIRMATION_INTENTS = new Set([
  "medicine_taken",
  "medicine_reminder",
  "medicine_schedule_query",
  "other",
]);

const SOS_REPLY = {
  te: "SOS పంపబడింది. మీ కుటుంబానికి తెలియజేసాము.",
  en: "SOS sent. Your family has been notified.",
};
const CANCELLED_REPLY = { te: "సరే, రద్దు చేసాను.", en: "Okay, cancelled." };
const CONFIRMED_REPLY = {
  te: "సరే, మీ అభ్యర్థన మీ కుటుంబానికి పంపాను.",
  en: "Okay, I've sent your request to your family.",
};
const RETRY_REPLY = {
  te: "క్షమించండి, మళ్ళీ చెప్పగలరా?",
  en: "Sorry, could you please say that again?",
};
const LOW_CONFIDENCE_REPLY = {
  te: "క్షమించండి, అర్థం కాలేదు. మళ్ళీ చెప్పగలరా?",
  en: "Sorry, I didn't quite get that. Could you say it again?",
};

const FOLLOW_UP_QUESTIONS = {
  medicineName: { te: "ఏ మందు?", en: "Which medicine?" },
  quantity: { te: "ఎంత కావాలి?", en: "How much do you need?" },
  doseTime: { te: "ఏ సమయంలో?", en: "At what time?" },
  location: { te: "ఎక్కడికి?", en: "Where to?" },
  transportType: { te: "ఏ వాహనం కావాలి?", en: "What kind of transport do you need?" },
  doctorName: { te: "ఏ డాక్టర్?", en: "Which doctor?" },
  items: { te: "ఏమేమి కావాలి?", en: "What items do you need?" },
  days: { te: "ఎన్ని రోజులు?", en: "For how many days?" },
  message: { te: "ఏమి చెప్పాలి?", en: "What would you like to say?" },
};
const GENERIC_FOLLOW_UP = { te: "దయచేసి మళ్ళీ చెప్పండి.", en: "Please tell me a bit more." };

function buildFollowUpReply(missingFields, language) {
  const entry = FOLLOW_UP_QUESTIONS[missingFields[0]] ?? GENERIC_FOLLOW_UP;
  return entry[language] ?? entry.te;
}

const CONFIRMATION_SUMMARIES = {
  medicine_pending: {
    te: (d) => `మీకు ${d.medicineName || "మందు"} అయిపోయింది. కుటుంబానికి చెప్పనా?`,
    en: (d) => `Your ${d.medicineName || "medicine"} is running low. Should I tell your family?`,
  },
  talk_family: {
    te: () => "మీ కుటుంబానికి కాల్ చేయమంటారా?",
    en: () => "Should I ask your family to call you?",
  },
  call_doctor: {
    te: (d) => `${d.doctorName || "డాక్టర్"} కి కాల్ చేయమంటారా?`,
    en: (d) => `Should I contact ${d.doctorName || "the doctor"}?`,
  },
  grocery: {
    te: (d) => `సరుకులు${d.items?.length ? ` (${d.items.join(", ")})` : ""} తెప్పించమంటారా?`,
    en: (d) => `Should I ask for groceries${d.items?.length ? ` (${d.items.join(", ")})` : ""}?`,
  },
  recharge: {
    te: () => "మీ ఫోన్ రీఛార్జ్ చేయమంటారా?",
    en: () => "Should I ask your family to recharge your phone?",
  },
  transport: {
    te: (d) => `${d.location || "మీ గమ్యానికి"} వాహనం ఏర్పాటు చేయమంటారా?`,
    en: (d) => `Should I arrange transport to ${d.location || "your destination"}?`,
  },
};
const GENERIC_CONFIRMATION = {
  te: () => "దీన్ని మీ కుటుంబానికి పంపమంటారా?",
  en: () => "Should I send this to your family?",
};

function buildConfirmationSummary(intent, details, language) {
  const entry = CONFIRMATION_SUMMARIES[intent] ?? GENERIC_CONFIRMATION;
  const fn = entry[language] ?? entry.te;
  return fn(details ?? {});
}

// Only non-null incoming values overwrite existing ones - a later "I don't
// know" (null) answer must never erase an earlier, actually-known value.
function mergeDetails(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (value !== null && value !== undefined) merged[key] = value;
  }
  return merged;
}

// find() needs to work whether the model/fake returns a plain array, a
// promise of one, or a Mongoose-style chainable query (which .sort() needs).
async function findSorted(model, filter, sort) {
  const query = model.find(filter);
  const sorted = typeof query.sort === "function" ? query.sort(sort) : query;
  return Array.isArray(sorted) ? sorted : await sorted;
}

// Returns the elder's open conversation, or null if there isn't one.
// Expires it (and returns null) if it's been idle past expiresAt - the TTL
// index on the model handles actual deletion, but that can lag by up to
// ~60s, so this check keeps behavior correct immediately, not eventually.
export async function findOpenConversation(ConversationModel, elderId) {
  const list = await findSorted(
    ConversationModel,
    { elderId, status: { $in: OPEN_CONVERSATION_STATUSES } },
    { createdAt: -1 }
  );
  const conversation = list[0];
  if (!conversation) return null;

  if (conversation.expiresAt && new Date(conversation.expiresAt).getTime() < Date.now()) {
    conversation.status = "expired";
    await conversation.save();
    return null;
  }
  return conversation;
}

async function cancelOpenConversation(ConversationModel, elderId) {
  const open = await findOpenConversation(ConversationModel, elderId);
  if (open) {
    open.status = "cancelled";
    await open.save();
  }
}

// medicine_taken: marks the single unambiguous pending dose taken. If
// several are pending and the stated medicineName (if any) doesn't narrow it
// to one, asks which one instead of ever guessing.
async function handleMedicineTaken({ elderId, details, language, deps }) {
  const { DoseLogModel, MedicineModel } = deps;
  const { start, end } = istDayRange(istDateOf(new Date()));

  const pendingDoses = await findSorted(
    DoseLogModel,
    { elderId, status: "pending", scheduledAt: { $gte: start, $lt: end } },
    { scheduledAt: 1 }
  );

  if (pendingDoses.length === 0) {
    return {
      status: "completed",
      reply: language === "en" ? "I don't see any pending medicine for today." : "ఈ రోజు పెండింగ్‌లో మందులు ఏమీ లేవు.",
    };
  }

  const medicines = await findSorted(MedicineModel, { elderId }, { name: 1 });
  const nameById = new Map(medicines.map((m) => [String(m._id), m.name]));

  let candidates = pendingDoses;
  if (details.medicineName) {
    const needle = details.medicineName.toLowerCase();
    const matchingIds = new Set(
      medicines.filter((m) => m.name.toLowerCase().includes(needle)).map((m) => String(m._id))
    );
    const narrowed = pendingDoses.filter((d) => matchingIds.has(String(d.medicineId)));
    if (narrowed.length > 0) candidates = narrowed;
  }

  if (candidates.length === 1) {
    await markDoseTaken(candidates[0], { reportedBy: "voice", source: "voice" });
    return {
      status: "completed",
      reply: language === "en" ? "Marked as taken. Well done!" : "తీసుకున్నట్టు నమోదు చేసాను.",
    };
  }

  const options = [...new Set(candidates.map((d) => nameById.get(String(d.medicineId)) ?? "medicine"))];
  return {
    status: "follow_up",
    reply: language === "en" ? "Which medicine did you take?" : "మీరు ఏ మందు తీసుకున్నారు?",
    options,
  };
}

// medicine_reminder / medicine_schedule_query: read-only, never edits anything.
async function handleMedicineReadOnly({ elderId, details, language, deps }) {
  const { MedicineModel } = deps;
  const medicines = await findSorted(MedicineModel, { elderId }, { name: 1 });

  if (medicines.length === 0) {
    return {
      status: "completed",
      reply: language === "en" ? "You have no medicines on file." : "మీకు నమోదు చేసిన మందులు లేవు.",
    };
  }

  let relevant = medicines;
  if (details.medicineName) {
    const needle = details.medicineName.toLowerCase();
    const narrowed = medicines.filter((m) => m.name.toLowerCase().includes(needle));
    if (narrowed.length > 0) relevant = narrowed;
  }

  const parts = relevant.map((m) => `${m.name} (${m.times.join(", ")})`);
  return {
    status: "completed",
    reply:
      language === "en" ? `Your medicine schedule: ${parts.join("; ")}.` : `మీ మందుల సమయం: ${parts.join("; ")}.`,
  };
}

// Shared by POST /assistant/confirm and by a voice "yes" detected mid-turn
// while awaiting_confirmation - both end up here, so the action is created
// exactly the same way either way.
export async function executeConfirmedAction({ conversation, userId, deps }) {
  const { CareRequestModel, AlertModel, notifier } = deps;

  const { request } = await createRequestWithAlert({
    elderId: conversation.elderId,
    requestedBy: userId,
    type: conversation.intent,
    details: conversation.collectedDetails,
    source: "chitti",
    notifier: notifier ?? noopNotifier,
    CareRequestModel,
    AlertModel,
  });

  conversation.status = "completed";
  conversation.pendingAction = { requestId: String(request._id) };
  await conversation.save();

  const reply = CONFIRMED_REPLY[conversation.language] ?? CONFIRMED_REPLY.te;
  return { requestId: String(request._id), reply };
}

// The orchestrator behind POST /assistant/turn. deps carries every model and
// the extractIntentFn (real ai.service.extractIntent in production, a fake
// in tests) so this whole state machine is unit-testable without Groq/Mongo.
export async function processTurn({ elderId, userId, message, language = "te", deps }) {
  const { ConversationModel, CareRequestModel, AlertModel, extractIntentFn, notifier } = deps;

  // 1. SOS overrides everything, in every state - keyword-only, never the LLM.
  if (detectSOS(message)) {
    await cancelOpenConversation(ConversationModel, elderId);
    const { request } = await createRequestWithAlert({
      elderId,
      requestedBy: userId,
      type: "sos",
      details: {},
      source: "chitti",
      notifier: notifier ?? noopNotifier,
      CareRequestModel,
      AlertModel,
    });
    return {
      status: "completed",
      reply: SOS_REPLY[language] ?? SOS_REPLY.te,
      conversationId: null,
      requestId: String(request._id),
    };
  }

  let conversation = await findOpenConversation(ConversationModel, elderId);

  // 2. awaiting_confirmation: keyword-only yes/no/cancel, never the LLM.
  if (conversation && conversation.status === "awaiting_confirmation") {
    const decision = detectYesNoCancel(message);
    if (decision === "yes") {
      const { requestId, reply } = await executeConfirmedAction({ conversation, userId, deps });
      return { status: "completed", reply, conversationId: String(conversation._id), requestId };
    }
    if (decision === "no" || decision === "cancel") {
      conversation.status = "cancelled";
      await conversation.save();
      return {
        status: "completed",
        reply: CANCELLED_REPLY[conversation.language] ?? CANCELLED_REPLY.te,
        conversationId: String(conversation._id),
      };
    }
    // Not recognized: re-show the same summary rather than guessing.
    return {
      status: "confirmation",
      reply: buildConfirmationSummary(conversation.intent, conversation.collectedDetails, conversation.language),
      conversationId: String(conversation._id),
    };
  }

  // 3. A brand-new turn, or a follow-up answer continuing a "collecting" conversation.
  let intentResult;
  if (!conversation && detectMedicinePending(message)) {
    // One of the three known phrases: skip Groq entirely for this fast path.
    intentResult = {
      intent: "medicine_pending",
      confidence: 1,
      details: {},
      missingFields: ["medicineName"],
    };
  } else {
    try {
      intentResult = await extractIntentFn(
        { transcript: message, collectedDetails: conversation?.collectedDetails ?? {} },
        deps
      );
    } catch {
      return {
        status: "needs_retry",
        reply: RETRY_REPLY[language] ?? RETRY_REPLY.te,
        conversationId: conversation ? String(conversation._id) : null,
      };
    }
  }

  if (!conversation) {
    if (intentResult.confidence < CONFIDENCE_THRESHOLD) {
      conversation = await ConversationModel.create({
        elderId,
        startedBy: userId,
        language,
        status: "collecting",
        intent: null,
        collectedDetails: {},
        missingFields: [],
        questionsAsked: 1,
        expiresAt: newExpiry(),
      });
      return {
        status: "follow_up",
        reply: LOW_CONFIDENCE_REPLY[language] ?? LOW_CONFIDENCE_REPLY.te,
        conversationId: String(conversation._id),
      };
    }

    conversation = await ConversationModel.create({
      elderId,
      startedBy: userId,
      language: intentResult.replyLanguage ?? language,
      status: "collecting",
      intent: intentResult.intent,
      collectedDetails: mergeDetails({}, intentResult.details),
      missingFields: intentResult.missingFields ?? [],
      questionsAsked: 0,
      expiresAt: newExpiry(),
    });
  } else {
    // Continuing: merge new details in, but the intent itself was already
    // decided on the first turn and is never re-classified mid-conversation.
    conversation.collectedDetails = mergeDetails(conversation.collectedDetails, intentResult.details);
    conversation.missingFields = intentResult.missingFields ?? [];
    conversation.expiresAt = newExpiry();
  }

  // 4. Read-only / no-CareRequest intents resolve immediately.
  if (NO_CONFIRMATION_INTENTS.has(conversation.intent)) {
    let outcome;
    if (conversation.intent === "medicine_taken") {
      outcome = await handleMedicineTaken({
        elderId,
        details: conversation.collectedDetails,
        language: conversation.language,
        deps,
      });
    } else if (conversation.intent === "medicine_reminder" || conversation.intent === "medicine_schedule_query") {
      outcome = await handleMedicineReadOnly({
        elderId,
        details: conversation.collectedDetails,
        language: conversation.language,
        deps,
      });
    } else {
      outcome = { status: "completed", reply: conversation.language === "en" ? "Okay." : "సరే." };
    }

    if (outcome.status === "follow_up") {
      conversation.status = "collecting";
      conversation.questionsAsked += 1;
      await conversation.save();
      return {
        status: "follow_up",
        reply: outcome.reply,
        options: outcome.options,
        conversationId: String(conversation._id),
      };
    }

    conversation.status = "completed";
    await conversation.save();
    return { status: "completed", reply: outcome.reply, conversationId: String(conversation._id) };
  }

  // 5. Confirmation-required intents: ask up to MAX_FOLLOW_UP_QUESTIONS, then confirm.
  if (conversation.missingFields.length > 0 && conversation.questionsAsked < MAX_FOLLOW_UP_QUESTIONS) {
    conversation.status = "collecting";
    conversation.questionsAsked += 1;
    await conversation.save();

    let options;
    if (conversation.missingFields[0] === "medicineName" && conversation.intent === "medicine_pending") {
      const medicines = await findSorted(deps.MedicineModel, { elderId }, { name: 1 });
      options = medicines.map((m) => m.name);
    }

    return {
      status: "follow_up",
      reply: buildFollowUpReply(conversation.missingFields, conversation.language),
      options,
      conversationId: String(conversation._id),
    };
  }

  conversation.status = "awaiting_confirmation";
  conversation.pendingAction = { type: conversation.intent, details: conversation.collectedDetails };
  await conversation.save();

  return {
    status: "confirmation",
    reply: buildConfirmationSummary(conversation.intent, conversation.collectedDetails, conversation.language),
    conversationId: String(conversation._id),
  };
}
