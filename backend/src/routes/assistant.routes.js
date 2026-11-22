// Chitti voice assistant.
// POST /api/v1/assistant/speech-to-text
// POST /api/v1/assistant/turn
// POST /api/v1/assistant/confirm
// POST /api/v1/assistant/speak
// GET  /api/v1/assistant/conversations/:id

import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { authenticate as defaultAuthenticate, requireUser } from "../middleware/authenticate.js";
import { canAccessElder } from "../middleware/authorize.js";
import Alert from "../models/Alert.js";
import CareRequest from "../models/CareRequest.js";
import Conversation from "../models/Conversation.js";
import DoseLog from "../models/DoseLog.js";
import Medicine from "../models/Medicine.js";
import { extractIntent } from "../services/ai.service.js";
import { noopNotifier } from "../services/careRequest.service.js";
import { executeConfirmedAction, processTurn } from "../services/conversation.service.js";
import { speechToText, textToSpeech } from "../services/speech.service.js";
import { ApiError } from "../utils/ApiError.js";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB: generous for one short voice turn
const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/aac",
]);
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
const LANGUAGE_TO_SARVAM_CODE = { te: "te-IN", en: "en-IN" };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_AUDIO_BYTES } });

const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, "Invalid id");

const turnSchema = z.object({
  elderId: objectIdSchema,
  message: z.string().trim().min(1, "message is required"),
  language: z.enum(["te", "en"]).optional(),
});

const confirmSchema = z.object({ conversationId: objectIdSchema });

const speakSchema = z.object({
  text: z.string().trim().min(1, "text is required"),
  language: z.enum(["te", "en"]).default("te"),
});

function parseInput(schema, input, message) {
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed(message, {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  return parsed.data;
}

function toPublicConversation(conversation) {
  return {
    id: String(conversation._id),
    elderId: String(conversation.elderId),
    status: conversation.status,
    intent: conversation.intent,
    collectedDetails: conversation.collectedDetails,
    missingFields: conversation.missingFields,
    language: conversation.language,
  };
}

// deps is optional; tests pass fake models, a fake extractIntentFn/speechToTextFn/
// textToSpeechFn/notifier, and fake authenticate/authDeps.
export function createAssistantRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const authDeps = deps.authDeps ?? {};
  const ConversationModel = deps.ConversationModel ?? Conversation;
  const CareRequestModel = deps.CareRequestModel ?? CareRequest;
  const AlertModel = deps.AlertModel ?? Alert;
  const MedicineModel = deps.MedicineModel ?? Medicine;
  const DoseLogModel = deps.DoseLogModel ?? DoseLog;
  const extractIntentFn = deps.extractIntentFn ?? extractIntent;
  const speechToTextFn = deps.speechToTextFn ?? speechToText;
  const textToSpeechFn = deps.textToSpeechFn ?? textToSpeech;
  const notifier = deps.notifier ?? noopNotifier;

  // Passed through to conversation.service.js's processTurn/executeConfirmedAction.
  const serviceDeps = {
    ConversationModel,
    CareRequestModel,
    AlertModel,
    MedicineModel,
    DoseLogModel,
    extractIntentFn,
    notifier,
  };

  const router = Router();

  router.post(
    "/assistant/speech-to-text",
    authenticate,
    requireUser,
    upload.single("audio"),
    async (req, res) => {
      const elderId = req.body?.elderId;
      if (!elderId || !OBJECT_ID_PATTERN.test(elderId)) {
        throw ApiError.validationFailed("Invalid elderId", {});
      }
      const allowed = await canAccessElder(req.user._id, elderId, null, authDeps);
      if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

      if (!req.file) throw ApiError.validationFailed("audio file is required", {});
      if (!ALLOWED_AUDIO_MIME.has(req.file.mimetype)) {
        throw ApiError.validationFailed("Unsupported audio type", { mimetype: req.file.mimetype });
      }

      const language = req.body?.language;
      const languageCode = LANGUAGE_TO_SARVAM_CODE[language];
      const result = await speechToTextFn({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        languageCode,
      });

      res.json({ transcript: result.transcript, language: result.languageCode ?? language ?? null });
    }
  );

  router.post("/assistant/turn", authenticate, requireUser, async (req, res) => {
    const body = parseInput(turnSchema, req.body, "Invalid turn data");

    const allowed = await canAccessElder(req.user._id, body.elderId, null, authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    const result = await processTurn({
      elderId: body.elderId,
      userId: req.user._id,
      message: body.message,
      language: body.language ?? "te",
      deps: serviceDeps,
    });

    res.json(result);
  });

  router.post("/assistant/confirm", authenticate, requireUser, async (req, res) => {
    const body = parseInput(confirmSchema, req.body, "Invalid confirm data");

    const conversation = await ConversationModel.findById(body.conversationId);
    if (!conversation) throw ApiError.notFound("Conversation not found");

    if (conversation.status !== "awaiting_confirmation") {
      throw ApiError.conflict("This conversation is not awaiting confirmation", {
        status: conversation.status,
      });
    }

    // Re-check permissions here too - never trust that the earlier /turn
    // check still holds (a CareLink can be revoked in between).
    const allowed = await canAccessElder(req.user._id, conversation.elderId, null, authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    const { requestId } = await executeConfirmedAction({
      conversation,
      userId: req.user._id,
      deps: serviceDeps,
    });

    res.json({ status: "done", requestId });
  });

  router.get("/assistant/conversations/:id", authenticate, requireUser, async (req, res) => {
    if (!OBJECT_ID_PATTERN.test(req.params.id)) throw ApiError.notFound("Conversation not found");

    const conversation = await ConversationModel.findById(req.params.id);
    if (!conversation) throw ApiError.notFound("Conversation not found");

    const allowed = await canAccessElder(req.user._id, conversation.elderId, null, authDeps);
    if (!allowed) throw ApiError.forbidden("You do not have permission for this elder");

    res.json({ conversation: toPublicConversation(conversation) });
  });

  // No elderId here by design: this only converts already-generated reply
  // text to audio, it never touches elder-specific data.
  router.post("/assistant/speak", authenticate, requireUser, async (req, res) => {
    const body = parseInput(speakSchema, req.body, "Invalid speak data");
    const languageCode = LANGUAGE_TO_SARVAM_CODE[body.language];

    const { audioBuffer, contentType } = await textToSpeechFn({ text: body.text, languageCode });

    res.set("Content-Type", contentType);
    res.send(audioBuffer);
  });

  // ---- Demo-only endpoints ----
  // Demo mode (no real signed-in account - see frontend/src/voice/chittiDemoEngine.js)
  // has no user or elder to check access for, so these skip authenticate/
  // requireUser/canAccessElder entirely. That's safe: like /assistant/speak
  // above, they carry no elder-specific data - just generic audio-in/
  // transcript-out and text-in/audio-out, scoped only by CORS to the
  // frontend's own origin (see FRONTEND_ORIGIN in config/env.js).
  router.post("/assistant/demo/speech-to-text", upload.single("audio"), async (req, res) => {
    if (!req.file) throw ApiError.validationFailed("audio file is required", {});
    if (!ALLOWED_AUDIO_MIME.has(req.file.mimetype)) {
      throw ApiError.validationFailed("Unsupported audio type", { mimetype: req.file.mimetype });
    }

    const language = req.body?.language;
    const languageCode = LANGUAGE_TO_SARVAM_CODE[language];
    const result = await speechToTextFn({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      languageCode,
    });

    res.json({ transcript: result.transcript, language: result.languageCode ?? language ?? null });
  });

  router.post("/assistant/demo/speak", async (req, res) => {
    const body = parseInput(speakSchema, req.body, "Invalid speak data");
    const languageCode = LANGUAGE_TO_SARVAM_CODE[body.language];

    const { audioBuffer, contentType } = await textToSpeechFn({ text: body.text, languageCode });

    res.set("Content-Type", contentType);
    res.send(audioBuffer);
  });

  return router;
}

export default createAssistantRouter();
