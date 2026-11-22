import mongoose from "mongoose";

export const CONVERSATION_STATUSES = [
  "collecting",
  "awaiting_confirmation",
  "completed",
  "cancelled",
  "expired",
];

// Statuses that count as "open" - still in progress, can be resumed or acted on.
export const OPEN_CONVERSATION_STATUSES = ["collecting", "awaiting_confirmation"];

export const MAX_FOLLOW_UP_QUESTIONS = 2;
export const CONVERSATION_IDLE_MS = 30 * 60 * 1000; // 30 minutes

const conversationSchema = new mongoose.Schema({
  elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true, index: true },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  language: { type: String, enum: ["te", "en"], default: "te" },
  status: { type: String, enum: CONVERSATION_STATUSES, default: "collecting" },
  intent: { type: String },
  collectedDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  missingFields: { type: [String], default: [] },
  questionsAsked: { type: Number, default: 0 },
  // Set once the conversation reaches awaiting_confirmation/completed: the
  // request type and details that /confirm (or an in-turn voice "yes") will
  // actually create, so confirmation never re-derives this from scratch.
  pendingAction: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  // TTL index: MongoDB's background task removes the document once this
  // instant has passed (expireAfterSeconds: 0 means "at the stored time",
  // not a fixed delay added to it). Reset on every turn to implement the
  // 30-minutes-idle expiry; findOpenConversation() below also checks this
  // field directly, since the TTL sweep itself can lag by up to ~60s.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export function newExpiry() {
  return new Date(Date.now() + CONVERSATION_IDLE_MS);
}

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
