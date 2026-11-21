# WellMate - Project Plan (Hackathon Edition)

Team: Rohini (MERN lead, voice agent, elder dashboard) + 1 intern (MERN; family dashboard, care directory, backend/data)
Target: Elderly people (grandparents/parents) in Telugu-speaking families, with English as second language.
Status: PLANNING ONLY. No code yet.

## 0. Hackathon decisions (defaults chosen; confirm or change)

- Target region/language: India, Telugu primary, English secondary.
- Platform: responsive web app, installable as PWA (mobile browser first). Not a native app.
- Auth: Firebase Authentication (decided). No custom JWT/password code.
- Business model: free for the hackathon/pilot.
- Hosting: free tiers (Vercel/Netlify for client, Render/Railway for API, MongoDB Atlas free tier, Cloudinary free tier).
- Notifications for demo: email (Nodemailer or SendGrid) + in-app popup for family members. SMS is a later phase.
- Team split: Rohini = voice agent "Chitti" + elder dashboard. Intern = family dashboard, care directory, API and database.

## 1. Product vision

WellMate helps older adults manage daily life safely and independently, and keeps family caregivers informed without constant phone calls.

Core promise: "Medicines on time, help one tap or one voice command away, and family always in the loop."

Signature feature: the voice assistant **"Chitti"**. An elder says "Chitti", and Chitti answers in Telugu, asks what help is needed, handles simple requests, and alerts the family.

## 2. Users and roles

| User | Needs |
|---|---|
| Elder (primary) | Very simple screen, big buttons, one tap or voice command (Chitti), medicine reminders, SOS, call family, find helpers/drivers |
| Family member (child, grandchild, relative) | Dashboard for each linked elder: medicines status, requests from Chitti, appointments, insurance, ongoing conditions, alerts. Gets email + in-app popup |
| Local helper (volunteer / caretaker) | Listed in directory; phase 2: accept tasks |
| Auto driver / cab driver | Listed in directory (contact only, phase 1) |
| Admin (us) | Adds and verifies directory entries (helpers, drivers, doctors) |

Family members may use the normal website. A voice-chat option for family members who cannot use smartphones is a later-version feature (not in hackathon scope).

## 3. Languages

- Telugu (primary): all elder-facing screens and Chitti speech.
- English: all screens, and family dashboard defaults to English with a language switch.
- Use an i18n setup (react-i18next). All strings in resource files, never hardcoded.
- Telugu text and spoken phrases need review by a native Telugu speaker before the demo.

## 4. MVP features (Phase 1 - hackathon scope)

Priority P0 = must demo. P1 = build if time allows.

1. (P0) Accounts and roles: sign up as elder or family; link family member to elder via invite code/email. Auth via provider.
2. (P0) Elder dashboard with big buttons and Chitti voice assistant (see ELDER_DASHBOARD.md).
3. (P0) Medicine manager: add medicine (name, dose, times, start/end date). Elder marks taken. Family sees today's status.
4. (P0) Chitti requests: elder's request (medicine done, talk to family, call doctor, grocery, recharge, other) creates a request. Family gets email + in-app popup.
5. (P0) SOS button: one tap sends alert to family by email and shows emergency numbers.
6. (P0) Senior/elder profile: name, age, blood group, allergies, ongoing conditions, doctors, emergency contacts, insurance (see section 4.1).
7. (P0) Family dashboard header and main view showing elder profile summary, insurance summary, today's medicines, open requests, and alerts.
8. (P1) Care directory: nearby volunteers/local caretakers, auto drivers, cab drivers (name, number, location, availability). Shown on both family and elder dashboards.
9. (P1) Appointments with reminders.
10. (P1) Image upload via Cloudinary (profile photo, prescription, insurance card).

### 4.1 Elder profile fields (detailed)

- Basic: full name, Telugu name (optional), age/date of birth, gender, photo (Cloudinary), address, village/area, preferred language.
- Health: blood group, allergies, ongoing conditions (list: condition name, since when, current status, notes; e.g., diabetes, BP, arthritis, heart disease, thyroid, asthma). Medical notes.
- Doctors: name, specialty, phone, clinic location, availability.
- Emergency contacts: name, relation, phone, email (ordered by priority).
- Insurance (list, one or more policies): provider name, policy type (health / Ayushman Bharat / government scheme / employer / other), policy number, validity (from-to), sum insured, what it covers (hospitalisation, OPD, medicines, surgery, diagnostics, critical illness, etc.), exclusions/waiting period notes, TPA/helpline number, claim process notes, insurance card image (Cloudinary).

Shown on: elder profile page (full), family dashboard header (summary: provider, policy active/expiry, key cover items, helpline number), and included in SOS/emergency view (provider and policy number only).

## 5. Later phases

- Phase 2: daily "I'm okay" check-in with missed check-in alert; SMS alerts (Twilio or MSG91); vitals log (BP, sugar, weight) with charts; prescription/report uploads; PDF reports; full Telugu/Hindi/Tamil UI; helper task acceptance; medicine stock and refill reminders.
- Phase 3: voice chat for family members who cannot use smartphones (phone call/IVR bridge); wearable/fall detection; teleconsultation links; pharmacy and grocery ordering integrations; native mobile wrapper; helper marketplace with payments.

## 6. UX rules for elderly users

- Body text 18px minimum; key actions 24px+. High contrast. Support browser zoom.
- Touch targets 48px minimum; max 6 big choices per screen.
- Icons plus text labels always. No swipe-only or hidden gestures.
- Confirm before cancelling or deleting. Voice confirmation before any request is sent to family ("Chitti: family ki pampali-aa? Avunu / Vaddu").
- Alarm/SOS screens stay until acknowledged, with sound and vibration.
- Elder never sees settings-heavy screens; family sets things up.

## 7. Tech stack (MERN)

- Frontend: React (Vite), React Router, React Query (server state), react-i18next (Telugu/English), a component library with large-text support (e.g., Chakra UI or MUI), PWA manifest + service worker.
- Voice: Browser Web Speech API (SpeechRecognition and SpeechSynthesis with language te-IN and en-IN) for the hackathon. Fallback: Google Cloud Speech-to-Text / Text-to-Speech or Azure if browser Telugu quality is poor. Keep a voice service module so the provider can be swapped.
- Backend: Node.js + Express. Validation with Zod. Helmet, CORS, express-rate-limit.
- Auth: Firebase Authentication. Client signs in with the Firebase SDK; backend verifies the Firebase ID token (firebase-admin) on every request and maps it to a User record. No custom JWT code.
- Database: MongoDB Atlas with Mongoose.
- Images: Cloudinary (upload from client with signed upload preset; store URL and public_id).
- Email: Nodemailer (SMTP) or SendGrid.
- Realtime popup for family: Socket.IO (preferred) or polling every 10-15 seconds as fallback.
- Scheduling (reminders, missed-dose check): node-cron for hackathon; BullMQ + Redis later.
- Testing: Jest + Supertest (API), React Testing Library + Jest (components), Playwright for one or two key end-to-end flows if time allows.
- Deployment: client on Vercel/Netlify; API on Render/Railway; MongoDB Atlas; GitHub for source control.

## 8. Data model (main collections)

- User: authProviderId, name, email, phone, role (elder | family | helper | driver | admin), language, createdAt.
- CareLink: elderId, familyUserId, relation, permissions (viewMedicines, receiveAlerts, editProfile), status (pending | active).
- ElderProfile: userId, dateOfBirth, gender, address, village/area, bloodGroup, allergies[], photoUrl, emergencyContacts[], doctors[].
- OngoingCondition: elderId, name, sinceYear, status, notes.
- InsurancePolicy: elderId, provider, policyType, policyNumber, validFrom, validTo, sumInsured, coverageItems[], exclusions, helplineNumber, cardImageUrl.
- Medicine: elderId, name, dosage, form, times[], startDate, endDate, instructions.
- DoseLog: medicineId, elderId, scheduledAt, status (pending | taken | skipped | missed), takenAt.
- ChittiSession: elderId, language, transcript, detectedIntent, createdAt.
- Request: elderId, sessionId, type (medicine_done | talk_family | call_doctor | grocery | recharge | sos | other), details, status (open | acknowledged | done), createdAt, handledBy.
- Alert: elderId, type (request | sos | missed_dose | missed_checkin), severity, createdAt, acknowledgedBy, acknowledgedAt.
- Appointment (P1): elderId, title, doctor, location, dateTime, status.
- DirectoryEntry: category (volunteer | caretaker | auto_driver | cab_driver | doctor), name, phone, area/location (text + optional lat/lng), availability (text or weekly slots), vehicleInfo (drivers), verified (boolean), addedBy, notes.
- Notification: userId, channel (email | inApp), payload, sentAt, readAt.

Key indexes: DoseLog(elderId, scheduledAt), CareLink(familyUserId), Request(elderId, status, createdAt), Alert(elderId, createdAt), DirectoryEntry(category, area).

## 9. API outline (REST, prefix /api/v1)

- Auth/session: GET /me (returns user and role)
- Elder profile: GET/PUT /elders/:id/profile
- Conditions: GET/POST /elders/:id/conditions, PATCH/DELETE /conditions/:id
- Insurance: GET/POST /elders/:id/insurance, PATCH/DELETE /insurance/:id
- Care links: POST /care-links/invite, POST /care-links/accept, GET /elders/:id/family
- Medicines: GET/POST /elders/:id/medicines, PATCH/DELETE /medicines/:id, GET /elders/:id/doses?date=, POST /doses/:id/take
- Chitti: POST /elders/:id/chitti/message (transcript in, reply + intent + follow-up out), POST /elders/:id/chitti/confirm (sends request to family)
- Requests and alerts: GET /elders/:id/requests, POST /requests/:id/ack, POST /elders/:id/sos, GET /elders/:id/alerts
- Directory: GET /directory?category=&area=, POST /directory (admin or verified helper), PATCH /directory/:id
- Family dashboard: GET /family/dashboard (all linked elders summary)
- Realtime: Socket.IO event "alert:new" to family room elder:<id>

Every route checks: caller is the elder, or an active linked family member with the right permission.

## 10. Chitti voice assistant (summary; full flow in ELDER_DASHBOARD.md)

- Trigger: big microphone button (primary, one tap) OR say "Chitti" (wake word, when the browser supports continuous listening).
- Response: Telugu greeting, then asks what help is needed.
- Handles: medicines done, talk to family, call local doctor, grocery, recharge, SOS, other.
- Asks follow-up questions, reads back the summary, asks for confirmation, then sends the request.
- Family gets email and in-app popup immediately.

## 11. Security and privacy

- HTTPS everywhere. Secrets only in environment variables; .env in .gitignore.
- Role checks on every endpoint; test that a family member cannot see an unlinked elder.
- Health and insurance data is sensitive: show only what each role needs; mask policy numbers in lists.
- Voice transcripts: store only what is needed; delete after a set period (e.g., 30 days). Say in the consent screen that voice is processed by the browser/speech provider.
- Microphone permission requested with a clear explanation in Telugu and English.
- Consent screen and privacy policy; data export and account deletion.
- Directory contacts (volunteers, drivers, doctors) are shared for help purposes only; the person must give consent before being listed; allow removal on request.
- Disclaimer: WellMate supports care but is not medical advice. Never auto-change medicine doses.
- Legal: India DPDP Act 2023 for personal data. Check before a public launch.

## 12. Project structure (monorepo)

```
wellmate/
  client/                 React app (Vite)
    src/
      pages/  components/  hooks/  api/  store/  i18n/  voice/  styles/
  server/                 Express API
    src/
      config/  models/  routes/  controllers/  services/
      middleware/  jobs/  realtime/  utils/  tests/
  docs/
    PROJECT_INFO.md
    ELDER_DASHBOARD.md
  .github/workflows/
  README.md
```

## 13. Timeline (hackathon, compressed)

Adjust the days to the real hackathon length. Assume it is short; cut P1 first.

| Block | Work | Owner |
|---|---|---|
| Block 1 | Confirm decisions in section 0; repo setup; auth provider wired; DB models; Cloudinary setup | Both |
| Block 2 | Elder dashboard UI (big buttons, Telugu/English); profile + conditions + insurance forms; medicine list and mark-taken | Rohini: elder UI. Intern: API and models |
| Block 3 | Chitti: mic button, speech in/out, intent detection (keyword rules first), follow-up questions, confirm step | Rohini |
| Block 4 | Requests and SOS API; email (Nodemailer); family dashboard with live popup; insurance summary header | Intern: API, email, dashboard. Rohini: popup UI |
| Block 5 | Care directory (volunteers, caretakers, auto/cab drivers) on both dashboards; seed data | Intern |
| Block 6 | Jest tests for API routes and key components; demo script; Telugu text review; deploy | Both |

Demo must show: elder taps mic, says "Chitti", answers in Telugu, makes a grocery request, family gets email and popup showing request + insurance summary, and directory lists nearby helpers and drivers.

## 14. Risks and mitigation

- Browser Telugu speech recognition is inaccurate: use keyword lists in Telugu and English; keep the big-button menu as the fallback so the elder can always tap; have the voice provider swappable.
- Wake word "Chitti" does not work on all phones (iOS Safari limits continuous listening): demo with the big mic button; wake word is best-effort.
- Email delivery delay or spam filter: show the in-app popup as the main channel for the demo.
- Elders cannot use the app: test with a real elder early; keep the home screen to a few big buttons.
- Directory data is incomplete or outdated: mark entries "verified" only after a call check; show "last verified" date.
- Scope creep in a hackathon: hold to P0; P1 only after P0 demo works.
- Privacy issues with health data: role checks and tests from day one.

## 15. Open decisions (answer when convenient)

1. Auth provider: Firebase Authentication (decided by Rohini).
2. Voice: browser Web Speech API only, or Google Cloud Speech for better Telugu? (Default: browser first.)
3. Which district/area is the demo location? (Needed for directory sample data.)
4. Hackathon length and submission date (drives the timeline).
5. Who is the demo elder, and can a real elder test with us?
