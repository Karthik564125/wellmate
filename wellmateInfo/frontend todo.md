# WellMate Frontend - Todo (pending work)

Sources of truth: wellmateInfo/PROJECT_INFO.md (features, UX rules, data model) and wellmateInfo/Complete_productinfo.md (Chitti voice pipeline, request flow, roles, medicine intents, API contract).
Priority: P0 = must demo, P1 = if time allows.

## P0 - must demo
Everything under P0 below is must demo.

Status key: [ ] pending, [~] partly done (exists, needs checking or rework), [x] done.
Proposed new file names below are suggestions only; check the real tree before creating.

## Already in place (from survey; verify each by opening it)
- [~] Landing, sign in, sign up, role picker: frontend/src/pages/LandingPage.jsx, SignInPage.jsx, SignUpPage.jsx, components/RoleSelect.jsx. Currently NOT Firebase; must be rewired (see P0 Auth).
- [~] Routes: /dashboard/elder, /dashboard/family, /dashboard/caretaker, /dashboard/admin, /dashboard/volunteer, and /medicines, /appointments, /care-team, /insurance, /cab, /profile. Route guards not verified.
- [~] pages/dashboards/ElderDashboard.jsx: big-button layout not verified.
- [~] pages/dashboards/FamilyDashboard.jsx: sections not verified; no request list, no live updates.
- [~] pages/MedicinesPage.jsx: add, mark taken, today status not verified.
- [~] pages/AppointmentsPage.jsx: shell.
- [~] i18n/LanguageContext.jsx: custom language context; Telugu strings not verified.
- [x] Generic UI pieces (Card, Modal, Tabs, Badge, Avatar, StatCard, Timeline, ToastProvider).
- [~] frontend/src/data/: mock data. Every screen using it must switch to API calls.

## P0 - Auth and routing
- [ ] Firebase Authentication client: sign up and sign in with email/password and Google. Phone sign-in left for later (elder access).
- [ ] Auth context (proposed: src/auth/AuthContext.jsx): holds Firebase user, exposes getIdToken() for API calls, signs out.
- [ ] API client (proposed: src/api/client.js): one fetch wrapper that adds "Authorization: Bearer <Firebase ID token>" to every request and handles 401 by sending the user to sign in.
- [ ] Role routing: after sign in, fetch GET /api/me (or the agreed equivalent) to get role and linked elders; route elder to elder dashboard, family to family dashboard. Unauthorised routes redirect.
- [ ] Sign-up stores the chosen role through the backend, not only in the browser.

## P0 - Chitti voice (frontend side of the pipeline)
Pipeline per Complete_productinfo.md: mic -> speech-to-text -> POST to backend -> LLM intent on backend -> follow-up or confirmation -> backend saves -> family updated.
- [ ] Voice service module (proposed: src/voice/chittiVoice.js) with two providers behind one interface: SarvamProvider (decided, see Open decisions) and BrowserProvider (Web Speech API, te-IN, fallback for testing). The UI never calls a provider directly.
- [ ] Sarvam speech-to-text: browser records audio (MediaRecorder); audio goes to the backend, which calls Sarvam. No Sarvam key in the frontend.
- [ ] Sarvam text-to-speech: backend returns audio for Chitti's reply; frontend plays it. Fallback to browser speech synthesis if the audio call fails.
- [ ] Big mic button (Chitti screen) with visible states: idle, listening, transcribing, thinking, speaking, error. Each state has text and an icon, not colour alone.
- [ ] Show the transcript the elder said, in Telugu and/or English, before anything is sent to family.
- [ ] Send transcript to POST /api/assistant/turn with elderId, message, language (te-IN or en-IN).
- [ ] Handle the three possible responses from /api/assistant/turn: (a) follow-up question, (b) confirmation request, (c) action completed. Each has its own screen state.
- [ ] Follow-up state: show Chitti's question on screen and speak it; the mic stays ready for the answer. A choice list is shown when the backend supplies options (e.g. the elder's medicine list).
- [ ] Confirmation state: read-back summary on screen and spoken; two large buttons "Avunu / Yes" and "Vaddu / No" (48px+, 24px text). Nothing is submitted without a tap or clear yes.
- [ ] Pending conversation resume: GET /api/assistant/conversations/:id when the screen reopens with a pending conversation.
- [ ] Confirm call: POST /api/assistant/confirm with conversationId.
- [ ] Wake word "Chitti": best-effort only, not a P0 dependency. The mic button is the main path.
- [ ] Voice disclaimers: first-use consent screen (Telugu and English) saying voice is processed by Sarvam AI and stored only as needed.

## P0 - Medicine intents (frontend must keep them separate)
- [ ] medicine_refill: "my medicines are running out" creates a refill request. Chitti asks which medicine; choices come from the elder's medicine list. Never guesses a name.
- [ ] medicine_taken: "I have taken my medicine" records a taken event. If more than one scheduled medicine is open, Chitti asks which one. Shows the time and who reported it.
- [ ] medicine_reminder and medicine_schedule_query: read-only answers shown and spoken. No edits from voice.
- [ ] Voice can never change a dose, prescription or schedule. No UI path for it.
- [ ] Medical disclaimer shown on the Chitti screen and in the request confirmation: "WellMate supports care, not medical advice."

## P0 - Elder side
- [ ] Elder dashboard (ElderDashboard.jsx): big buttons: Talk to Chitti, My medicines, Call family, SOS, My requests. Max 6 choices on screen.
- [ ] My requests list for the elder: type, status (new / waiting for family / accepted / done), time. Read-only status.
- [ ] SOS button: one tap, full-screen alarm until acknowledged, sound and vibration, shows emergency numbers. Sends a request of type sos.
- [ ] Medicines page (MedicinesPage.jsx): add medicine (name, dose, times, start and end date), mark taken, today's status. Real API, not mock data.
- [ ] Elder profile (full): basic info, blood group, allergies, ongoing conditions (add, edit, remove), doctors, emergency contacts in priority order.
- [ ] Insurance UI: list of policies with policy number masked, add, edit, delete (confirm before delete), card image field (upload later).

## P0 - Family side
- [ ] Family dashboard (FamilyDashboard.jsx) header: elder name, insurance summary (provider, active or expiry, key cover items, helpline).
- [ ] Family request dashboard: list of care requests, newest first. Each card shows type, details (e.g. medicine name), requested through Chitti or manual, requestedBy, status, assignedTo ("Not yet assigned" when null).
- [ ] Request actions: Accept task, Assign to family member (uses POST /api/tasks), Mark done (PATCH /api/requests/:id).
- [ ] Today's medicines panel: status per dose (pending, taken, missed).
- [ ] Live updates: Socket.IO client. On event "new-care-request", add the request to the list and show a notification. Connect to the family room only after auth. Polling via GET /api/requests as a fallback if the socket fails.
- [ ] Notification popup (in-app) for new requests and SOS, stays until acknowledged for SOS.
- [ ] Link family to elder: invite by code or email, accept invite (proposed endpoints: POST /api/care-links/invite, POST /api/care-links/accept).

## P0 - Elder UX rules (from PROJECT_INFO section 6)
- [ ] Body text 18px minimum; key actions 24px+; touch targets 48px+; max 6 big choices per screen.
- [ ] High contrast; browser zoom works; icons plus text labels; no swipe-only actions.
- [ ] Confirm before cancel or delete. Elder never sees settings-heavy screens.

## P0 - Language
- [ ] Telugu and English switch on every elder screen; Chitti replies in the chosen language.
- [ ] Telugu strings in resource files, not hardcoded. Flag for native speaker review before demo.
- [ ] Decide react-i18next vs keep LanguageContext (see Open decisions).

## P0 - Replace mock data
- [ ] Every screen that reads frontend/src/data/ switches to the API client. Delete mock imports once real data works.

## P0 - Setup and quality
- [ ] Install Firebase client SDK; environment variables for Firebase config only (no secrets in the frontend).-i will add them in backend
- [ ] Styling decision: Tailwind CSS (Complete_produ-ctinfo.md) vs existing custom styles (see Open decisions).--keep existing
- [ ] React Query for server state (PROJECT_INFO section 7).
- [ ] PWA manifest and service worker.
- [ ] Tests: Jest + React Testing Library for Chitti state screens, role routing, and the request card. Test that an elder cannot open family pages.--yes tests needed 
- [ ] npm run lint and npm run build clean before demo.

## P1 - if time allows
- [ ] Care directory UI (volunteers, caretakers, auto drivers, cab drivers): name, number, area, availability, verified badge, last verified date. On family and elder dashboards.
- [ ] Appointments with reminders (extend AppointmentsPage.jsx).
- [ ] Cloudinary upload for profile photo, prescription, insurance card (signed upload from the frontend).
- [ ] Other Chitti intents in the same pipeline: grocery, recharge, transport, family_call, doctor.
- [ ] Volunteer view: only assigned tasks and necessary contact details.
- [ ] Caretaker and admin dashboards: scope after the P0 demo works.

## Open decisions (need your answer; they change the work above)
1. Speech-to-text: you chose Sarvam AI. Complete_productinfo.md suggests Web Speech API (te-IN) first, with a dedicated API as fallback. Current plan: Sarvam, with Web Speech only as the testing fallback. Confirm.-yes
2. Styling: Complete_productinfo.md says Tailwind CSS; PROJECT_INFO says a component library with large-text support (Chakra or MUI); the survey found custom components and no UI library. Pick one.---what ever present leave it dont add any new library
3. API prefix: PROJECT_INFO uses /api/v1/...; Complete_productinfo.md uses /api/... Pick one before backend work starts.
4. Roles: PROJECT_INFO has elder, family, helper, driver, admin. Complete_productinfo.md has elder, family, volunteer, admin. The app has caretaker and volunteer dashboards. Pick the final list.
5. Email: PROJECT_INFO says Nodemailer or SendGrid; Complete_productinfo.md says Resend. Backend decision, listed here because the family popup depends on it.
6. i18n: react-i18next (PROJECT_INFO) vs keep LanguageContext.
7. Family-care-hub.html (project root, static prototype): design reference or retire?
