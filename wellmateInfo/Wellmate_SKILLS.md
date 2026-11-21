# Wellmate --- Coding Assistant Skills & Project Rules

> **Project:** Wellmate\
> **Purpose:** Elder-first family care coordination web app\
> **Tagline:** Care connects us, wherever we are.\
> **Primary audience:** Telugu-speaking elderly people and their
> families\
> **Hackathon:** ACE Builders Hackathon 2026

This file is the instruction guide for any AI coding assistant working
on Wellmate. Read it before changing code. The existing repository is
the source of truth for what is already implemented.

## 1. Collaboration rules

The project owner is learning and building the application hands-on.

1.  Do not take over the project. Explain the proposed change and guide
    the owner.
2.  Do not create, rewrite, move, rename or delete files unless the
    owner explicitly asks you to make that change.
3.  When asked for guidance, provide the next small step rather than
    generating the entire application.
4.  Explain what the code does, why it is needed, where it belongs, how
    to run/test it, and what success looks like.
5.  Use beginner-friendly explanations. Explain unfamiliar packages,
    APIs, architecture patterns and TypeScript types.
6.  Inspect existing code before suggesting changes. Do not assume
    files, routes, components or data models are empty.
7.  Preserve working code and the intern's implementation wherever
    possible. Avoid unnecessary rewrites and migrations.
8.  Make one logical change at a time and provide a verification step.
9.  Never claim code, tests, integrations, deployments or API calls
    succeeded unless actually run and observed.
10. Ask one focused question when essential information is missing; do
    not invent requirements.
11. Never ask the owner to paste API keys, passwords, private keys or
    service-account JSON into chat.

Before editing, inspect the repository, identify conventions, explain
intended changes and keep them minimal. After editing, list changed
files, explain key decisions, give commands to run, report tests
actually executed and identify anything not verified. Do not silently
install dependencies or change architecture.

## 2. Product vision

Wellmate connects elderly people, remote family members, personal
caretakers and trusted local helpers. An elder can speak to **Chitti**
in Telugu or English to request help. Chitti gathers details, reads the
request back, obtains confirmation, saves it and notifies authorised
family/caretakers.

Wellmate is not a diagnosis system and does not replace doctors or
clinical judgement.

**Elder-first principle:** Grandma should not have to learn a
complicated app; the app should adapt to Grandma.

UX requirements: - Large readable text and touch targets. - Simple
screens with few choices. - Telugu-first experience, with English
support. - Clear microphone, listening, processing and speaking
states. - Confirmation before important actions. - Obvious cancel,
repeat and help controls. - Never communicate status by colour alone. -
Avoid technical language in elder-facing screens.

## 3. Technology decisions

Use installed versions and existing conventions. Do not upgrade packages
without a reason.

### Frontend

-   React, Vite and TypeScript.
-   Tailwind CSS if already configured.
-   Preserve existing routing and component structure.
-   Keep the existing custom React language context for Telugu/English
    for the MVP. Do not migrate to `react-i18next` unless the owner
    decides to.

### Backend and database

-   Node.js and Express.
-   JavaScript ES modules unless the existing backend deliberately uses
    TypeScript.
-   MongoDB Atlas and Mongoose.

### Authentication

-   Firebase Authentication in the frontend.
-   Firebase Admin SDK in the backend to verify Firebase ID tokens.
-   Firebase UID is the stable identity key for a Firebase-authenticated
    user.
-   MongoDB stores Wellmate profiles, care-circle memberships, roles and
    application data.

### Chitti voice stack

-   STT: **Sarvam Saaras v4**.
-   TTS: **Sarvam Bulbul v4 Flash**.
-   Primary language: Telugu (`te-IN`).
-   Secondary language: Indian English (`en-IN`).
-   MVP interaction: **tap-to-talk**.
-   Browser `MediaRecorder` captures microphone audio.
-   Sarvam APIs are called from the backend. Never expose the Sarvam API
    key in the browser.

### AI reasoning

-   Use one LLM with structured output for intent extraction and
    conversation responses.
-   Backend owns permissions, validation, database operations and action
    execution.
-   Do not add LangChain or LangGraph just to call an LLM. A direct
    provider SDK and a small service layer are sufficient for the MVP.
-   Introduce an agent framework only when a concrete requirement
    justifies it.

### Other planned technologies (add only when needed)

-   Socket.IO for real-time updates.
-   Email provider for notifications.
-   Cloudinary for document/image storage.
-   Vitest/Jest, React Testing Library and Supertest.
-   Vercel/Netlify for frontend; Render/Railway for backend.

Do not install every planned technology at once. Add dependencies only
when implementing a feature that needs them.

## 4. Roles and permissions

Roles are scoped to a family care circle. A user may have different
roles in different care circles.

### Elder

-   Uses a simple elder dashboard and Chitti.
-   Views their own permitted profile, family contacts, medicines,
    appointments and request statuses.
-   Creates care requests and can raise SOS.
-   Reports a medicine as taken only when the exact scheduled medicine
    is identified.
-   Cannot manage family membership, roles or permissions.

### Family Member

-   Signs in using Firebase Authentication.
-   Joins one or more care circles through an invitation/linking flow.
-   Views elder information permitted by care-circle permissions.
-   Creates, acknowledges, assigns/reassigns and tracks requests/tasks
    where authorised.
-   Assigns tasks to self or another authorised member.
-   Views shared care timeline and notifications.
-   Manages family-verified medicine schedules and appointment reminders
    only when permitted.

### Family Admin

Family Admin is a Family Member with additional administration
privileges for one care circle: - Creates/configures the care circle and
links elders. - Invites family members and caretakers. - Assigns allowed
roles and permissions within that circle. - Manages emergency contacts,
notification recipients, care assignments and family-level settings. -
Reviews important activity/audit history.

**Family Admin is not the global Wellmate Platform Admin.**

### Volunteer / Local Helper

-   Creates a helper profile and submits verification details.
-   Provides service categories and service area.
-   Views only available/assigned task details.
-   Accepts/declines tasks, updates status and communicates with the
    family.
-   Receives minimum necessary elder contact/task information.
-   Must not see insurance, financial details, unrelated medical records
    or family administration screens.

### Personal Caretaker

-   Has a regular/dedicated care assignment.
-   Views assigned elder's relevant care information, family-verified
    medicine schedule, assigned tasks, open requests and alerts.
-   Acknowledges requests and SOS alerts.
-   Updates task progress and daily care notes.
-   Communicates with authorised family members.
-   Must not see insurance, financial/billing information, family role
    settings or unrelated medical records.
-   Cannot change prescriptions, doses or clinical instructions.

### Platform Admin

-   Internal Wellmate operator role for platform-wide operations and
    directory verification.
-   Separate from Family Admin.
-   Must not be granted to a family user merely because they administer
    a family circle.

### Role security rules --- non-negotiable

1.  Users cannot change their own role from the website.
2.  Frontend role controls are presentation only, not security.
3.  Backend authorization is required on every protected API request.
4.  Never trust client-supplied role, UID, elder ID or care-circle ID
    without verifying identity and membership in the database.
5.  Verify Firebase ID tokens on the backend.
6.  Resolve active care-circle membership and permissions on the
    backend.
7.  Check elder-specific assignment and permissions before returning
    elder data.
8.  Caretakers/volunteers access only elders/tasks they are assigned or
    explicitly authorised to access.
9.  Family Admin permissions apply only within the relevant care circle.
10. Record important changes in audit/activity logs.
11. Apply least privilege and return only fields the current user needs.

## 5. Chitti voice agent architecture

Chitti is a conversational assistant for creating and tracking care
requests. It is not an unrestricted autonomous agent.

### Voice request flow

1.  Elder taps the microphone in React.
2.  Browser requests microphone permission and records audio using
    `MediaRecorder`.
3.  Frontend uploads audio to the Wellmate Express backend.
4.  Backend validates the authenticated user, audio size/type and
    request limits.
5.  Backend sends audio to Sarvam Saaras v4.
6.  Sarvam returns a transcript.
7.  Backend sends transcript and relevant conversation context to the
    LLM.
8.  LLM returns structured intent, extracted fields, missing fields,
    response text and confirmation requirements.
9.  Backend validates the result and checks role, care-circle membership
    and permissions.
10. If information is missing, Chitti asks a follow-up and stores
    conversation state.
11. When details are complete, Chitti reads the proposed request back.
12. Elder explicitly confirms.
13. Only after confirmation does the backend create the MongoDB request.
14. Backend notifies authorised family/caretakers.
15. Backend sends Chitti's response text to Sarvam Bulbul v4 Flash.
16. Frontend plays generated audio and displays response text.

### Separation of responsibilities

-   **Sarvam STT:** audio to text; it does not decide permissions or
    save records.
-   **LLM:** understands language, classifies intent, extracts fields
    and drafts responses; it does not directly access MongoDB or execute
    privileged actions.
-   **Backend:** validates identity, permissions, fields and
    confirmation; owns all database writes/actions.
-   **Sarvam TTS:** text to audio; it does not decide application
    actions.
-   **Frontend:** records audio, displays conversation state and plays
    audio; it contains no provider secrets.

### Voice UI states

Use explicit states such as: `idle`, `requesting_permission`,
`recording`, `uploading`, `transcribing`, `thinking`,
`asking_follow_up`, `awaiting_confirmation`, `speaking`, `completed`,
`error`.

Provide start, stop, cancel and repeat controls. Prevent accidental
duplicate submissions.

### Supported MVP intents

-   Ask about today's family-verified medicine schedule.
-   Report a scheduled medicine as taken, after identifying the exact
    scheduled item.
-   Request a medicine refill.
-   Ask to contact family.
-   Request help with a doctor appointment.
-   Grocery request.
-   Recharge request.
-   Transport request.
-   Local-help request.
-   SOS/emergency request.
-   Other/general request.

Do not invent unsupported intents or map unclear requests to high-impact
actions.

### Structured LLM output

Use a validated schema matching the implementation. Conceptual example:

``` json
{
  "language": "te-IN",
  "intent": "grocery_request",
  "entities": { "items": [] },
  "missing_fields": ["items"],
  "assistant_message": "తప్పకుండా అమ్మమ్మా! మీకు ఏం కావాలి?",
  "requires_confirmation": false,
  "confidence": 0.94
}
```

This is an example, not a fixed API contract. Validate all fields
server-side. Never trust model-generated IDs, roles, permissions,
database instructions or arbitrary tool names.

### Confirmation and safety

-   Never create a care request based only on an unconfirmed
    interpretation.
-   Read back important details in the user's language before saving.
-   Provide clear cancel/correct options.
-   If transcription confidence is low or names, dates, quantities or
    addresses are ambiguous, ask the user to repeat/clarify.
-   Never invent medicine names, doses, quantities, appointment dates,
    doctors or family contacts.
-   Never diagnose, recommend treatment, change prescriptions or alter
    dosages.
-   Clinical decisions remain with qualified doctors.
-   SOS must have an accidental-activation safeguard without delaying
    genuine emergency handling.
-   Never claim an emergency contact was notified unless the backend
    confirms delivery/acceptance.

### Sarvam secrets, credits and costs

-   Store `SARVAM_API_KEY` only in the backend environment.
-   Never use a `VITE_` prefix for the Sarvam secret.
-   Never commit `.env` or secret files.
-   `.env.example` contains placeholders only.
-   Never log API keys, authorization headers, secrets or sensitive
    audio.
-   Check the current Sarvam dashboard for credits, usage and pricing.
    Free credits, eligibility and pricing can change; do not hardcode
    claims about free usage.
-   Add audio-duration, file-size and request limits to avoid accidental
    credit consumption.
-   Handle rate limits, insufficient credits, network failures and
    provider errors gracefully.
-   Do not claim an API request succeeded unless the provider response
    confirms it.

## 6. Firebase Authentication

### Frontend

-   Use Firebase Authentication for signup, sign-in, sign-out and
    auth-state observation.
-   Keep Firebase web configuration in frontend environment variables.
-   The Firebase web API key is a project config value; it is not
    backend authorization.
-   Never store user passwords in MongoDB.
-   Client-side route guards are not sufficient security.

### Backend

-   Use Firebase Admin SDK to verify ID tokens sent by the frontend.
-   Derive authenticated Firebase UID from the verified token.
-   Look up the Wellmate profile and care-circle membership in MongoDB.
-   Apply backend role/resource authorization on every protected route.
-   A client-supplied UID is never proof of identity.

### Firebase service account

-   Keep service-account credentials outside source control.
-   Use the hosting provider's secret manager/environment configuration
    in deployment.
-   For local development, use a protected local file or secure
    environment-based setup.
-   Never put Firebase Admin credentials in React or browser bundles.

## 7. Backend API and data design

Use REST endpoints, consistent status codes and consistent response
shapes. Follow existing route conventions.

Potential MVP endpoints (implement only when needed): -
`GET /api/health` - `POST /api/assistant/turn` -
`GET /api/assistant/conversations/:id` - `POST /api/assistant/confirm` -
`POST /api/requests` - `GET /api/requests` - `PATCH /api/requests/:id` -
`POST /api/tasks` - `GET /api/elders/:id`

Suggested data areas: - users; - elders; - family care
circles/memberships; - care requests; - tasks; - family-verified
medicine schedules; - medicine dose logs; - appointments; - documents; -
timeline events; - local providers; - notifications; - assistant
conversations; - audit logs.

Do not create all collections before the corresponding feature is
understood.

API conventions: - Validate request bodies, params and query strings. -
Use consistent error responses. - Avoid returning unnecessary database
fields. - Paginate potentially large lists. - Use server-side
timestamps. - Prevent duplicate submissions where appropriate. - Use
idempotency for retryable actions, especially request
creation/confirmation and notifications. - Do not expose stack traces or
secrets in production responses. - Log useful request context without
logging sensitive personal/medical data.

## 8. Privacy, security and data safety

1.  Use synthetic demo data for the hackathon. Never use real patient
    records in the demo.
2.  Collect only information needed for a feature.
3.  Enforce least-privilege access on the backend.
4.  Do not expose insurance or financial information to
    volunteers/caretakers.
5.  Do not expose one family's data to another family.
6.  Protect uploaded documents/media; do not use public, guessable URLs
    for private records.
7.  Validate upload type and size.
8.  Avoid putting personal/medical information in URLs, analytics events
    or logs.
9.  Do not retain raw voice recordings unless there is a clear approved
    need; prefer deleting temporary audio after transcription.
10. Protect secrets and rotate any key accidentally committed or
    exposed.
11. Use HTTPS in deployed environments.
12. Add rate limiting and safe error handling to public endpoints.
13. Maintain audit events for role, permission, assignment and important
    record changes.
14. Do not make medical claims or offer diagnosis/treatment advice.

## 9. Demo setup

Use fictional synthetic data only.

Suggested demo area: **Vijayawada, Andhra Pradesh**.\
Suggested fictional elder: **Savitri Amma**, Telugu preferred.

Possible demo data: - one upcoming appointment; - two fictional
family-verified scheduled medicines; - one pending grocery request; -
one assigned caretaker task; - two connected family members.

These are demo suggestions, not real people or medical records. Keep
demo data separate from real user data and do not use real contact
details.

The demo should show: 1. Elder speaks to Chitti. 2. Chitti understands
and asks for missing information. 3. Elder confirms. 4. Request is
saved. 5. Authorised family member sees the update. 6. Shared timeline
shows who did what and what remains pending.

## 10. Screens to preserve/build

### Elder

-   Elder Home Dashboard
-   Chitti Voice Screen
-   My Requests
-   My Medicines
-   SOS
-   My Appointments
-   My Profile

### Family Member

-   Family Dashboard
-   Elder Profile
-   Medicine Management
-   Appointments
-   Care Requests
-   Family Tasks
-   Shared Care Timeline
-   Medical Records
-   Insurance (only with permission)
-   Care Directory
-   Notifications

### Family Admin

All permitted Family Member screens plus: - Family Setup - Elder
Management - Invitations - Role Assignment - Permission Management -
Caretaker Management - Emergency Contacts and Notification Settings -
Audit/Activity History

### Volunteer / Local Helper

-   Registration/Profile
-   Verification
-   Service Area and Categories
-   Available/Assigned Tasks
-   Task Details
-   Accept/Decline
-   Task Status Updates
-   History
-   Notifications

### Personal Caretaker

-   Assigned Elder Dashboard
-   Today's Family-Verified Medicines
-   Open Requests and Alerts
-   Assigned Care Tasks
-   Daily Care Updates
-   SOS Acknowledgement
-   Notifications
-   Care History

Do not show admin, insurance or financial screens to unauthorised roles.

## 11. Development workflow

Work in this order; do not jump ahead when an earlier milestone is
broken:

1.  Inspect and run the existing frontend.
2.  Understand folders, routing, components and custom language context.
3.  Finish Firebase web app setup and frontend authentication.
4.  Create/verify the Express backend and `GET /api/health`.
5.  Connect frontend to backend.
6.  Add Firebase token verification to protected backend routes.
7.  Implement care-circle membership and role authorization.
8.  Test one authorised and one unauthorised API request.
9.  Test Sarvam STT independently with a short synthetic Telugu audio
    sample.
10. Test Sarvam TTS independently with a short Telugu sentence.
11. Connect browser recording to backend STT.
12. Add structured LLM intent extraction and conversation state.
13. Add confirmation and request persistence.
14. Add family notifications and shared timeline.
15. Polish the demo and test failure cases.

Testing should cover: - normal successful flow; - missing/invalid
input; - unauthenticated request; - authenticated but unauthorised
user; - wrong care-circle or elder assignment; - provider/network
failure; - duplicate/retried request.

Use synthetic test accounts and records.

Code quality: - Prefer readable code over clever abstractions. - Keep
components focused. - Keep API/provider logic out of presentation
components. - Keep business rules and authorization on the backend. -
Reuse existing utilities and conventions. - Use TypeScript types that
reflect real data; avoid spreading `any`. - Avoid premature abstraction
and unnecessary packages. - Document environment configuration. -
Comment non-obvious security/business rules, not every line.

## 12. Environment variables and secrets

Illustrative frontend `.env` (public Firebase web configuration only):

``` env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Illustrative backend `.env`:

``` env
PORT=5000
SARVAM_API_KEY=your_sarvam_api_key
MONGODB_URI=your_mongodb_connection_string
```

Configure Firebase Admin credentials securely for local and deployed
environments. Do not commit service-account JSON.

Rules: - `.env` files must be ignored by Git. - `.env.example` contains
placeholders only. - Never hardcode real secrets. - Never prefix
backend-only secrets with `VITE_`. - If a secret is committed/exposed,
rotate or revoke it; deleting the visible line is not sufficient.

## 13. Error handling and accessibility

-   Show helpful, non-technical messages to elders.
-   Keep actionable developer details in server logs without secrets or
    sensitive records.
-   Provide retry for recoverable provider/network errors.
-   Do not automatically replay/resubmit actions that could create
    duplicates.
-   Explain microphone permission denial and provide a text fallback
    where feasible.
-   Support keyboard navigation and visible focus.
-   Use semantic HTML and accessible control labels.
-   Ensure Telugu text renders correctly and is not clipped.
-   Test mobile and desktop layouts.

## 14. Out of scope for the first MVP

Do not add unless the owner asks or core demo is working: - always-on
wake-word listening such as "Hey Chitti"; - native mobile application; -
complex multi-agent orchestration; - LangChain/LangGraph without a
demonstrated need; - autonomous medical decisions; - diagnosis,
treatment or prescription recommendations; - automatic medicine
changes; - payments/billing; - real patient data in the hackathon
demo; - broad platform-admin tooling beyond demo needs.

Tap-to-talk is the MVP. Wake-word activation is a later enhancement
because browser background/continuous microphone access is unreliable
and permission-sensitive.

## 15. Decision log

Current decisions: - Product: elder-first family care coordination. -
Primary demo language: Telugu; English also supported. - Language
architecture: keep existing custom React context for MVP. - Voice:
Sarvam Saaras v4 STT and Bulbul v4 Flash TTS. - Voice interaction:
tap-to-talk. - Agent: custom backend-controlled conversation flow using
an LLM with structured output; no agent framework required initially. -
Authentication: Firebase Authentication. - Backend token verification:
Firebase Admin SDK. - Database: MongoDB Atlas with Mongoose. - Demo
data: synthetic only. - Suggested demo area: Vijayawada, Andhra
Pradesh. - Suggested fictional elder: Savitri Amma.

Raise open questions with the owner instead of guessing. Check the
actual repository and current provider documentation before relying on
version-specific SDK method names, request formats, model availability,
pricing or free-credit terms.

## 16. Final instruction

Your job is to help the owner understand, build, test and own Wellmate.

**Do not optimise for the amount of code generated. Optimise for a
working feature the owner understands.**

Always inspect before editing, preserve existing work, explain
significant changes, implement the smallest useful step, protect
data/secrets, enforce backend permissions, ask for confirmation before
important writes, test and report honestly, and guide the owner through
the next step.
