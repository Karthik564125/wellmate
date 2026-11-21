# WellMate Backend - Plan and Todo

Sources: wellmateInfo/PROJECT_INFO.md, wellmateInfo/Complete_productinfo.md, wellmateInfo/ELDER_DASHBOARD.md, wellmateInfo/frontend todo.md (latest decisions block), wellmateInfo/FRONTEND_PLAN.md.
Status key: [ ] pending, [~] partly done, [x] done.
Host: Windows. Use PowerShell-compatible commands in any setup notes.

## Decisions
- Stack: Node.js + Express 5, MongoDB Atlas + Mongoose, Firebase Admin SDK (verify ID tokens), Socket.IO (family live updates), Resend (email), Sarvam AI (speech-to-text and text-to-speech), Groq API (intent extraction).
- Module system: ES modules. Supabase removed from backend.
- API prefix: /api/v1 for every route.
- Roles: elder, family, volunteer, admin, caretaker. Role is per user; permissions are per elder link (see Permissions).
- Medicine request type name: medicine_pending. Remove "medicine_refill" from request types everywhere.
- Intent list: medicine_pending, medicine_taken, medicine_reminder, medicine_schedule_query, talk_family, call_doctor, grocery, recharge, transport, sos, other.
- Voice entry: elder taps the mic. Browser records audio (MediaRecorder); backend receives audio and calls Sarvam STT. Wake word "Chitti" is NOT in backend scope.
- LLM: Groq, model openai/gpt-oss-120b, called only from the backend. Settings: stream false (Structured Outputs does not support streaming), reasoning effort low to start (benchmark medium), temperature 0 or 0.2, max completion tokens 512 to start, strict JSON Schema output. Key in backend .env only.
- LLM intent is the primary path. Keyword rules are a small fallback for a few known cases only (SOS trigger words, the three medicine phrases, yes/no/cancel). No large keyword engine.
- Email: Resend. Save the request first; email and socket failures never roll back the save.
- Sarvam calls and Groq calls are made by the backend only. Frontend never holds these keys.
- Hosting: Render or Railway for the API; MongoDB Atlas free tier.

## Open decisions (answer before the matching item starts)
1. Module system: RESOLVED. The project uses ES modules (import/export). The user sets "type": "module" in backend/package.json themselves; do not change that field in any tool step. server.js was converted from require() to import on 2026-11-21 and verified booting; write every new backend file as ESM.
2. Supabase: RESOLVED. @supabase/supabase-js is removed from backend dependencies. Do not reintroduce it.
3. server.js: RESOLVED. backend/server.js exists (committed in b8f0cc6) and is now ESM (import syntax), starting an Express app with a single GET / route. Extend this file; do not create a new one.
4. Sarvam: account, plan, exact STT and TTS model names and endpoints, accepted audio formats (MediaRecorder usually produces webm/opus or mp4; check Sarvam support), size and duration limits. Verify from Sarvam's current docs.
5. Groq: confirm openai/gpt-oss-120b supports strict JSON Schema structured output on Groq today, and the current rate limits and cost per call.
6. Medication dose data: who enters medicines and schedules (family only, recommended). Confirm.
7. Transcript retention: 30 days (PROJECT_INFO and ELDER_DASHBOARD). Confirm.
8. Family permission model: PROJECT_INFO uses viewMedicines, receiveAlerts, editProfile; Complete_productinfo uses view_requests, manage_tasks. Recommended: one combined list (below). Confirm.
9. Email recipients for SOS: all active linked family, or only those with receiveAlerts. Recommended: receiveAlerts.
10. Care-link invite method: code or email. Confirm which (both supported in the plan, one needed for P0).

## Architecture
Request path for one voice turn:
1. Frontend sends audio (multipart) to POST /api/v1/assistant/speech-to-text. Backend checks Firebase token, elder access, file type and size, then calls Sarvam STT. Returns transcript.
2. Frontend sends transcript to POST /api/v1/assistant/turn.
3. Backend: keyword fallback check for SOS first (SOS overrides everything). Otherwise, load pending conversation from MongoDB, call Groq for structured intent, validate the JSON with a schema (Zod), run permission checks, decide: follow-up, confirmation, or completed (non-request actions such as medicine_taken).
4. Frontend shows follow-up or confirmation. On yes, POST /api/v1/assistant/confirm. Backend re-checks permissions, saves CareRequest, writes Alert and Notification rows, emits Socket.IO event, sends Resend email.
5. Replies to the elder: POST /api/v1/assistant/speak returns Sarvam TTS audio for the reply text.

Rules that must hold everywhere:
- The LLM never touches the database and never changes a medicine, dose, prescription or schedule. It returns JSON only; backend decides.
- Every LLM output is validated. If validation fails, the backend uses the fallback or asks the elder to say it again. Never store unvalidated output.
- Confirmation is required before any request reaches family. Yes must be explicit.
- Max 2 follow-up questions per conversation; then summary and confirm buttons.
- The LLM is called only for intent extraction and clarification, not for every sentence.

## Permissions
Role check per request plus relationship check per elder.
- Elder: read and update own requests and voice conversations for own elder profile; mark own doses taken; cannot read other elders.
- Family (linked, active CareLink): read elder data where permitted; create and update requests and tasks; receive alerts if receiveAlerts; edit profile and schedules only if editProfile.
- Volunteer: sees only tasks assigned to them and minimal contact details. No medical data.
- Caretaker: as family for elders they are linked to with the caretaker permission; no admin actions. Scope to confirm in Open decisions 8.
- Admin: manages users and directory listings; verifies directory entries.
- Every route uses authenticate (Firebase token) then authorize (elder access + permission). Unlinked user gets 403 on every elder route.
- Test: a family member cannot read an unlinked elder; an elder cannot read another elder; a volunteer cannot read medical fields.

## Data model (MongoDB, Mongoose)
- User: authUid (Firebase uid, unique), name, email, phone, role (elder | family | volunteer | admin | caretaker), preferredLanguage (te | en), createdAt.
- Elder: userId (the elder's own User, optional for elders without an account), displayName, dateOfBirth, gender, bloodGroup, allergies[], address, area, photoUrl, preferredLanguage.
- CareLink: elderId, userId (family/volunteer/caretaker), relation, permissions[] (viewMedicines, receiveAlerts, editProfile, manageRequests, manageTasks), status (pending | active | revoked), invitedBy, createdAt. Unique on (elderId, userId).
- Condition: elderId, name, sinceYear, status, notes.
- Doctor: elderId, name, specialty, phone, clinicLocation, availability.
- EmergencyContact: elderId, name, relation, phone, email, priority (1 = first).
- InsurancePolicy: elderId, provider, policyType, policyNumber (stored; masked in API lists), validFrom, validTo, sumInsured, coverageItems[], exclusions, helplineNumber, cardImageUrl.
- Medicine: elderId, name, dosage, form, times[] (HH:mm), startDate, endDate, instructions, createdBy.
- DoseLog: medicineId, elderId, scheduledAt, status (pending | taken | missed | skipped), takenAt, reportedBy (elder | family | voice), source (manual | voice).
- Conversation: elderId, startedBy, language, status (collecting | awaiting_confirmation | completed | cancelled | expired), intent, collectedDetails (Mixed), missingFields[], questionsAsked (max 2), pendingAction, createdAt, expiresAt (TTL, e.g. 30 minutes idle).
- ChittiTurn: conversationId, elderId, transcript, llmOutput (validated JSON), fallbackUsed (bool), createdAt, expiresAt (TTL 30 days). Store the transcript only, never the audio.
- CareRequest: elderId, conversationId (nullable), requestedBy (userId), type (medicine_pending | talk_family | call_doctor | grocery | recharge | transport | sos | other), details (Mixed), status (new | waiting_family | accepted | done | cancelled), assignedTo (userId, nullable), source (chitti | manual), confirmedAt, createdAt, updatedAt.
- Task: requestId, assignedTo (userId), assignedBy, status (open | accepted | done), createdAt.
- Alert: elderId, type (request | sos | missed_dose), severity, requestId (nullable), createdAt, acknowledgedBy, acknowledgedAt.
- Notification: userId, channel (email | inApp), payload, status (queued | sent | failed), sentAt, readAt, error.
- DirectoryEntry (P1): category (volunteer | caretaker | auto_driver | cab_driver | doctor), name, phone, area, lat/lng (optional), availability, vehicleInfo, verified, lastVerifiedAt, consentGiven, addedBy.
Indexes: DoseLog(elderId, scheduledAt); CareLink(elderId, userId) unique; CareLink(userId); CareRequest(elderId, status, createdAt); Alert(elderId, createdAt); DirectoryEntry(category, area); Conversation(elderId, status); ChittiTurn expiresAt TTL; Conversation expiresAt TTL.

## Intent output (LLM, strict JSON Schema)
Shape the model must return:
- intent: one of the intent list above.
- confidence: number 0 to 1.
- details: object with optional fields per intent (medicineName, quantity, doseTime, message, items[], days, location, transportType, doctorName).
- missingFields: string array of field names still needed.
- requiresConfirmation: boolean.
- replyLanguage: te | en.
Backend rules after validation:
- confidence below a threshold (start at 0.6, tune in spike) becomes a clarification question, not an action.
- intent sos from the LLM is never ignored; keyword SOS check runs first anyway.
- details are merged into the conversation's collectedDetails; the backend never trusts the LLM to mark a field as filled unless it is present in details.
- medicine_taken with more than one open dose asks which medicine; never guesses.

## Conversation state machine
- New turn with no open conversation: create Conversation (collecting), run intent.
- collecting + missingFields not empty + questionsAsked < 2: return follow-up question (Telugu/English per language), increment questionsAsked.
- collecting + missingFields empty: move to awaiting_confirmation, return summary and requiresConfirmation.
- awaiting_confirmation + elder says yes: /confirm executes action. no or cancel: cancelled.
- Any state + SOS: start SOS path immediately; cancel the open conversation.
- Expired (idle 30 min): status expired; a new turn starts fresh.
- Resume: GET /assistant/conversations/:id returns the open conversation for that elder only.

## Error shape (all routes)
{ "error": { "code": "STRING_CODE", "message": "human readable", "details": {} } }
Codes to define: UNAUTHENTICATED (401), FORBIDDEN (403), NOT_FOUND (404), VALIDATION_FAILED (400), CONFLICT (409), RATE_LIMITED (429), UPSTREAM_FAILED (502, Sarvam or Groq or Resend down), INTERNAL (500). Telugu user-facing text is produced by the frontend from the code; backend returns English message plus code.

## API (prefix /api/v1)
Auth and identity
- GET /me: user, role, linked elders with permissions.
Assistant (Chitti)
- POST /assistant/speech-to-text: multipart audio, elderId, language. Returns { transcript, language }.
- POST /assistant/turn: { elderId, message, language }. Returns { status: follow_up | confirmation | completed | needs_retry, reply, options?, conversationId }.
- POST /assistant/confirm: { conversationId }. Returns { status: done, requestId }.
- GET /assistant/conversations/:id: pending conversation for the caller.
- POST /assistant/speak: { text, language }. Returns audio (Sarvam TTS).
Elder data
- GET/PUT /elders/:id/profile
- GET/POST /elders/:id/conditions; PATCH/DELETE /conditions/:id
- GET/POST /elders/:id/doctors; PATCH/DELETE /doctors/:id
- GET/POST /elders/:id/emergency-contacts; PATCH/DELETE /emergency-contacts/:id
- GET/POST /elders/:id/insurance (list masks policyNumber); PATCH/DELETE /insurance/:id
Medicines
- GET/POST /elders/:id/medicines; PATCH/DELETE /medicines/:id
- GET /elders/:id/doses?date=YYYY-MM-DD
- POST /doses/:id/take (elder or permitted family; records reportedBy and time)
Requests, tasks, alerts
- GET /requests (filtered by role and permission); POST /requests (manual)
- PATCH /requests/:id (status; done or cancelled)
- POST /requests/:id/ack (acknowledge; SOS stays open until acknowledged)
- POST /tasks (assign family or volunteer task on a request)
- POST /elders/:id/sos (SOS request, alert, email, socket)
- GET /elders/:id/alerts
Care links
- POST /care-links/invite; POST /care-links/accept; GET /elders/:id/family
- PATCH /care-links/:id (permissions); DELETE /care-links/:id (revoke)
Family dashboard
- GET /family/dashboard (all linked elders: insurance summary, today's doses, open requests, alerts, Chitti summary)
Directory (P1)
- GET /directory?category=&area=; POST /directory (admin or verified caretaker); PATCH /directory/:id; admin verify endpoint.
Realtime
- Socket.IO: room family:<elderId> (joined only after token check and active CareLink). Event "new-care-request" and "alert:new".

## P0 - must demo
### Foundations
- [x] Open decisions 1, 2 and 3 resolved (2026-11-21). ES modules; server.js converted to import syntax and verified starting (GET / returns 200). @supabase/supabase-js uninstalled from package.json and package-lock.json, empty node_modules/@supabase and node_modules/@firebase leftovers deleted, npm ci --dry-run reports in sync. package.json keeps express, cors, dotenv + nodemon (dev). User sets "type": "module" in backend/package.json.
- Known, not blocking: npm audit reports 2 moderate issues (minimatch via nodemon, dev-only; fix requires a breaking nodemon downgrade). Leave unless it starts to matter.
- [ ] Add dependencies: mongoose, firebase-admin, socket.io, zod, helmet, express-rate-limit, resend, multer (audio upload), jest, supertest (dev).
- [~] Config module: load .env (MONGODB_URI, FIREBASE service account, GROQ_API_KEY, SARVAM_API_KEY, RESEND_API_KEY, FRONTEND_ORIGIN). Fail fast on missing keys. Done: backend/.env.example lists every key (PORT, NODE_ENV, FRONTEND_ORIGIN, MONGODB_URI, FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY, GROQ_API_KEY, GROQ_MODEL, SARVAM_API_KEY, SARVAM_STT_MODEL, SARVAM_TTS_MODEL, RESEND_API_KEY, RESEND_FROM_EMAIL); .env is gitignored and untracked. Still to write: the loader module itself with fail-fast validation. Real .env currently holds only GROQ_API_KEY and GROQ_MODEL (openai/gpt-oss-120b).
- [ ] Express app: JSON body limit, CORS for FRONTEND_ORIGIN only, helmet, rate limit on /assistant/* (per user), central error handler using the error shape above.
- [ ] MongoDB connection with Mongoose; health route GET /api/v1/health.
- [ ] Folder structure per Complete_productinfo: models/, routes/, controllers/, services/ (speech, ai, request, notification, permission), middleware/ (authenticate, authorize), validators/ (Zod schemas), server.js.

### Auth and permissions
- [ ] authenticate middleware: read Bearer token, verify with Firebase Admin verifyIdToken, load User by authUid, attach req.user. 401 on missing or bad token.
- [ ] Sign-up route: POST /auth/register (or /me on first login) creates User with role. Role is set by backend, not trusted from the client.
- [ ] authorize middleware: canAccessElder(userId, elderId, permission). Checks active CareLink or elder owner. 403 otherwise.
- [ ] Tests: unlinked user gets 403; elder cannot read another elder; volunteer cannot read medical fields; revoked link loses access.

### Voice pipeline
- [ ] Sarvam STT service: receives audio buffer, calls Sarvam with language te-IN or en-IN, returns transcript. Spike first (Open decision 4).
- [ ] Sarvam TTS service: text to audio for /assistant/speak. Spike first.
- [ ] POST /assistant/speech-to-text route: multer memory upload, size limit (set after spike), mime check, rate limit.
- [ ] Groq service: chat completion with response_format as strict JSON Schema, stream false, model openai/gpt-oss-120b, temperature 0 to 0.2, max_completion_tokens 512, reasoning effort low. Timeout and one retry on 5xx. Returns parsed JSON or UPSTREAM_FAILED.
- [ ] Zod validation of Groq output. Reject and fall back on failure.
- [ ] Keyword fallback service: SOS words (Telugu and English from ELDER_DASHBOARD section 4G), three medicine phrases, yes/no/cancel. Only these.
- [ ] Conversation service: create, update collectedDetails, count questions, expire, resume.
- [ ] POST /assistant/turn route: runs SOS check, then conversation state machine, then Groq if needed. Returns status and reply.
- [ ] POST /assistant/confirm route: re-checks permissions, creates CareRequest (medicine_pending first), writes Alert, Notification rows, socket emit, Resend email (after save).
- [ ] GET /assistant/conversations/:id route.
- [ ] POST /assistant/speak route.
- [ ] Spike: Groq structured output on 20 sample sentences (Telugu, English, mixed; include "Naaku tablets ayipoyayi", "Medicine malli kavali", "Chitti, naa mandulu aipoyayi, pillalu ki cheppu"). Record accuracy and latency at low and medium reasoning effort.

### Medicines and doses
- [ ] Medicine CRUD (family with editProfile or manageMedicines; elder read-only unless owner).
- [ ] Doses: generate DoseLog rows for a day from Medicine times (job or on-demand), GET doses by date.
- [ ] POST /doses/:id/take: sets taken, takenAt, reportedBy, source. Idempotent.
- [ ] Voice medicine_taken: if one open dose, mark it; if several, return a question with options; never guess. Voice never edits Medicine.
- [ ] Voice medicine_pending: creates CareRequest type medicine_pending after confirmation; details.medicineName from collected details, chosen from elder's medicine list when possible.

### Requests, SOS and family alerts
- [ ] GET /requests (family sees linked elders' requests with manageRequests; elder sees own).
- [ ] POST /requests (manual), PATCH /requests/:id, POST /requests/:id/ack.
- [ ] POST /elders/:id/sos: saves SOS CareRequest and Alert severity high before any notification; then Socket.IO and email to receiveAlerts family.
- [ ] SOS stays open (status waiting_family) until family acknowledges; ack records acknowledgedBy.
- [ ] Notification service: Resend email, with status recorded in Notification. Failure logged; request remains saved.
- [ ] Socket.IO server: attach to HTTP server; authenticate socket with Firebase token; join family:<elderId> only if active CareLink.

### Elder profile and family
- [ ] Elder profile CRUD; conditions, doctors, emergency contacts (ordered by priority), insurance (policyNumber masked in list responses).
- [ ] Care links: invite (code or email), accept, list, change permissions, revoke. Invite code expires.
- [ ] GET /family/dashboard aggregates insurance summary, today's doses, open requests, alerts, Chitti summary (text only).

### Quality and deploy
- [ ] Jest + Supertest tests for auth, permissions, conversation state machine, keyword fallback, Zod validation, /confirm creating medicine_pending, SOS path.
- [ ] Mock Sarvam, Groq and Resend in tests; real calls only in the spikes.
- [ ] npm run start works; .env in .gitignore; no secrets in repo.
- [ ] Deploy API to Render or Railway; set env vars; health check passes.

## P1 - if time allows
- [ ] Directory: DirectoryEntry CRUD, consentGiven required, verified flag and lastVerifiedAt, admin verify endpoint, filter by category and area.
- [ ] Appointments: model and CRUD; reminder job (node-cron).
- [ ] Missed-dose job (node-cron) creating Alert missed_dose.
- [ ] Other Chitti intents: grocery, recharge, transport, talk_family, call_doctor end-to-end (the pipeline already supports them; add handlers and tests).
- [ ] Repeat SOS email every 5 minutes until acknowledged (phase 2 in ELDER_DASHBOARD).
- [ ] Cloudinary signed upload endpoint (returns signature; frontend uploads directly).
- [ ] Volunteer assigned-task view and POST /tasks.
- [ ] Transcript cleanup job (delete ChittiTurn past retention; TTL index handles it).
- [ ] Audit log for permission-sensitive actions (who changed a link, who took a dose).

## Phase 2 and later
- Phone or SMS alerts (Twilio or MSG91); helper task acceptance; voice chat for family without smartphones; LLM for more intents; data export and account deletion (DPDP).

## Done when (backend)
- POST /assistant/turn with "Naaku tablets ayipoyayi" returns a follow-up asking which medicine (or a confirmation if the name was given).
- POST /assistant/confirm saves a medicine_pending CareRequest, and the family's dashboard gets the event and an email.
- SOS creates a saved request and alert even if email or socket fails.
- A family member outside the elder's CareLink gets 403 on every elder route.
- Tests pass, lint passes, server starts on Render or Railway with health check passing.
