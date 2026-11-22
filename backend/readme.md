# WellMate — Backend

Node.js + Express REST API powering the WellMate elder-care platform. Handles authentication verification, role-based authorization, Chitti AI orchestration, real-time alerts, and all business logic.

---

## 🛠️ Tech Stack

| Concern | Library / Service |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB Atlas + Mongoose 9 |
| Auth verification | Firebase Admin SDK 14 |
| AI intent extraction | Groq LLM (`openai/gpt-oss-120b`) |
| Voice STT/TTS | Sarvam AI (Saaras v4 · Bulbul v4 Flash) |
| Voice agent sessions | Sarvam Samvaad |
| Email alerts | Resend |
| Realtime | Socket.IO 4 |
| Validation | Zod 4 |
| File uploads | Multer 2 |
| Security | Helmet, CORS, express-rate-limit |
| Dev server | Nodemon |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.js                # Entry point: Express app, middleware, route mounting
│   ├── config/
│   │   ├── db.js                # MongoDB connection (Mongoose)
│   │   └── env.js               # Validated environment config (Zod)
│   ├── FireBase/
│   │   └── firebase.js          # Firebase Admin SDK initialization
│   ├── middleware/
│   │   ├── authenticate.js      # Verify Firebase ID token → req.user
│   │   ├── authorize.js         # Role + elder-link permission checks
│   │   ├── errorHandler.js      # Global error handler & 404 handler
│   │   └── rateLimiter.js       # Rate limiting for /api/v1/assistant/*
│   ├── models/
│   │   ├── User.js              # Firebase-linked user accounts
│   │   ├── Elder.js             # Elder profile (DOB, blood group, allergies…)
│   │   ├── CareLink.js          # Elder ↔ family member relationship + permissions
│   │   ├── CareRequest.js       # Care requests (Chitti or manual)
│   │   ├── CareAssignment.js    # Caretaker task assignments
│   │   ├── Caretaker.js         # Caretaker directory entries
│   │   ├── Condition.js         # Ongoing health conditions
│   │   ├── Doctor.js            # Doctor contacts per elder
│   │   ├── EmergencyContact.js  # Priority-ordered emergency contacts
│   │   ├── InsurancePolicy.js   # Health insurance policies
│   │   ├── Medicine.js          # Medicine prescriptions + schedules
│   │   ├── DoseLog.js           # Daily dose taken / missed tracking
│   │   ├── Appointment.js       # Doctor appointments
│   │   ├── Conversation.js      # Chitti multi-turn session state
│   │   ├── Alert.js             # SOS / missed-dose / request alerts
│   │   └── Notification.js      # Email + in-app notification records
│   └── routes/
│       ├── index.js             # Mounts all feature routers at /api/v1
│       ├── auth.routes.js       # POST /auth/register
│       ├── me.routes.js         # GET /me
│       ├── elder.routes.js      # Elder CRUD + profile
│       ├── careLink.routes.js   # Invite / accept family links
│       ├── careRequest.routes.js# Care requests + SOS + alerts
│       ├── condition.routes.js  # Ongoing conditions
│       ├── doctor.routes.js     # Doctor list per elder
│       ├── emergencyContact.routes.js
│       ├── insuranceRoutes.js   # Insurance policies
│       ├── medicine.routes.js   # Medicines + dose logging
│       ├── appointment.routes.js
│       ├── caretaker.routes.js  # Caretaker directory
│       ├── assistant.routes.js  # Chitti voice turns + confirm
│       ├── sarvam.routes.js     # Sarvam Samvaad session tickets
│       ├── health.routes.js     # GET /health (uptime check)
│       └── notification.routes.js
├── __seed_demo_accounts.mjs     # Seeds realistic demo data (elders, family, medicines…)
├── .env                         # Local secrets — never committed
├── .env.example                 # Template with all required keys
└── package.json
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in every value before starting.

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Server port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_ORIGIN` | Exact frontend origin for CORS (e.g. `http://localhost:5173`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (keep `\n` escapes, wrap in quotes) |
| `GROQ_API_KEY` | Groq API key for intent extraction |
| `GROQ_MODEL` | Groq model name (e.g. `openai/gpt-oss-120b`) |
| `SARVAM_API_KEY` | Sarvam AI API key (STT + TTS) |
| `SARVAM_STT_MODEL` | Sarvam speech-to-text model (Saaras v4) |
| `SARVAM_TTS_MODEL` | Sarvam text-to-speech model (Bulbul v4 Flash) |
| `SARVAM_APP_ID` | Sarvam Samvaad app ID |
| `SARVAM_WORKSPACE_ID` | Sarvam workspace ID |
| `SARVAM_ORG_ID` | Sarvam organisation ID |
| `SARVAM_SESSION_TICKET_SECRET` | HMAC secret for short-lived session tickets |
| `SARVAM_RUNTIME_BASE_URL` | Sarvam runtime base URL (optional) |
| `SARVAM_SESSION_PATH` | Sarvam session path (confirm against Sarvam docs) |
| `RESEND_API_KEY` | Resend API key for email alerts |
| `RESEND_FROM_EMAIL` | Verified sender address in Resend |

> [!CAUTION]
> Never commit `.env`. It is in `.gitignore`. The `FIREBASE_PRIVATE_KEY` must include literal `\n` escape sequences — paste the full key in double quotes.

---

## 🚀 Setup & Running

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (free tier works for dev)
- Firebase project with Authentication enabled + a service account key
- Groq, Sarvam AI, and Resend accounts

### Install dependencies

```bash
cd backend
npm install
```

### Development (hot-reload)

```bash
npm run dev
# → Wellmate server running on port 5000
```

### Production

```bash
npm start
```

### Seed demo data

```bash
node __seed_demo_accounts.mjs
```

This creates realistic demo elders, family accounts, medicines, conditions, and insurance entries so you can test without real personal data.

---

## 📡 API Reference

All routes are prefixed with `/api/v1`. Every protected route requires a Firebase ID token in the `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Firebase token | Register user, link Firebase UID to User document |
| `GET` | `/me` | ✅ | Current user profile + role |

### Elder Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/elders` | ✅ | List elders the caller can access |
| `POST` | `/elders` | ✅ | Create a new elder record |
| `GET` | `/elders/:id` | ✅ | Get elder profile |
| `PUT` | `/elders/:id` | ✅ | Update elder profile |

### Care Links (Elder ↔ Family)

| Method | Path | Description |
|---|---|---|
| `POST` | `/care-links/invite` | Send family member invite |
| `POST` | `/care-links/accept` | Accept invite with code |
| `GET` | `/elders/:id/family` | List linked family members |

### Medicines & Doses

| Method | Path | Description |
|---|---|---|
| `GET` | `/elders/:id/medicines` | List medicines |
| `POST` | `/elders/:id/medicines` | Add a medicine |
| `PATCH` | `/medicines/:id` | Update medicine |
| `DELETE` | `/medicines/:id` | Remove medicine |
| `GET` | `/elders/:id/doses?date=YYYY-MM-DD` | Doses for a specific date |
| `POST` | `/doses/:id/take` | Mark a dose as taken |

### Health Data

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/elders/:id/conditions` | Ongoing conditions |
| `PATCH/DELETE` | `/conditions/:id` | Update / remove condition |
| `GET/POST` | `/elders/:id/doctors` | Doctor list |
| `GET/POST` | `/elders/:id/emergency-contacts` | Emergency contacts |
| `GET/POST` | `/elders/:id/insurance` | Insurance policies |
| `PATCH/DELETE` | `/insurance/:id` | Update / remove policy |

### Appointments

| Method | Path | Description |
|---|---|---|
| `GET` | `/elders/:id/appointments` | List appointments |
| `POST` | `/elders/:id/appointments` | Create appointment |
| `PATCH` | `/appointments/:id` | Update appointment |

### Chitti (Voice Assistant)

| Method | Path | Description |
|---|---|---|
| `POST` | `/elders/:id/chitti/message` | Send voice transcript; returns reply + intent + follow-up |
| `POST` | `/elders/:id/chitti/confirm` | Confirm intent → save CareRequest + notify family |
| `GET` | `/conversations/:id` | Get pending conversation state |

### Care Requests & Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/elders/:id/requests` | Open care requests |
| `POST` | `/requests/:id/ack` | Acknowledge a request |
| `POST` | `/elders/:id/sos` | Trigger SOS alert (all linked family notified) |
| `GET` | `/elders/:id/alerts` | Elder alerts |

### Family Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/family/dashboard` | Summary for all linked elders |

### Sarvam Samvaad

| Method | Path | Description |
|---|---|---|
| `GET` | `/sarvam/session` | Issue short-lived session ticket for Chitti voice agent |

### Health Check

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Uptime check (`{ status: "ok" }`) |

---

## 🔐 Authentication & Authorization

### How it works

1. **Frontend** signs in via Firebase Authentication (Google / email).
2. **Frontend** attaches `Authorization: Bearer <Firebase ID token>` to every API request.
3. **`authenticate` middleware** calls `firebase-admin.auth().verifyIdToken()` — rejects with 401 if invalid.
4. **`authorize` middleware** checks the caller's role and their CareLink relationship to the target elder for per-resource permissions.

### Permission model

| Role | What they can do |
|---|---|
| `elder` | Access own profile, medicines, requests, Chitti |
| `family` | Access linked elders (via CareLink); manage requests and alerts |
| `caretaker` | Access assigned elder tasks, medicines |
| `volunteer` | View assigned help requests |
| `admin` | Manage all users, assignments, directory |

> [!IMPORTANT]
> The AI (Groq LLM) **never** decides permissions. It only extracts intent. Node.js always makes the authorization decision.

---

## 🧠 Chitti Voice Pipeline

```
POST /elders/:id/chitti/message
  │
  ├─ authenticate → authorize (elder or linked family)
  │
  ├─ Sarvam STT (if audio blob) ──▶ transcript text
  │        OR transcript already text from frontend
  │
  ├─ Load Conversation state from MongoDB
  │
  ├─ Groq LLM ──▶ structured intent JSON
  │   { intent, confidence, details, missingFields, requiresConfirmation }
  │
  ├─ If missingFields → reply with follow-up question
  │
  └─ If complete + requiresConfirmation → reply "Shall I send to family?"
            │
     POST /elders/:id/chitti/confirm
            │
            ├─ Save CareRequest (MongoDB)
            ├─ Socket.IO → family room "new-care-request"
            └─ Resend email → all active linked family members
```

**Supported intents:**

| Intent | Chitti action |
|---|---|
| `medicine_taken` | Record DoseLog |
| `medicine_refill` | Create grocery-type CareRequest |
| `talk_family` | Create family-call CareRequest + email |
| `call_doctor` | Show doctor contact from profile |
| `grocery` | Create grocery CareRequest with items list |
| `recharge` | Create recharge CareRequest |
| `transport` | Show nearby auto/cab drivers |
| `sos` | Trigger SOS (immediate, no confirmation needed) |
| `other` | Ask follow-up or escalate to family |

---

## 🗄️ Data Models

### Key schemas

**`User`** — `authUid` (Firebase UID), `name`, `email`, `phone`, `role` (elder | family | caretaker | volunteer | admin), `language`

**`Elder`** — `userId?`, `displayName`, `email`, `dateOfBirth`, `gender`, `bloodGroup`, `allergies[]`, `address`, `area`, `photoUrl`, `preferredLanguage` (te | en)

**`CareLink`** — `elderId`, `familyUserId`, `relation`, `permissions[]`, `status` (pending | active)

**`CareRequest`** — `elderId`, `requestedBy`, `type`, `details`, `status` (new | acknowledged | done), `assignedTo`, `confirmedAt`

**`Medicine`** — `elderId`, `name`, `dosage`, `form`, `times[]`, `startDate`, `endDate`, `instructions`

**`DoseLog`** — `medicineId`, `elderId`, `scheduledAt`, `status` (pending | taken | skipped | missed), `takenAt`

**`Conversation`** — `elderId`, `intent`, `status` (collecting_details | awaiting_confirmation | done), `collectedDetails`, `nextQuestion`

**`InsurancePolicy`** — `elderId`, `provider`, `policyType`, `policyNumber`, `validFrom`, `validTo`, `sumInsured`, `coverageItems[]`, `exclusions`, `helplineNumber`, `cardImageUrl`

**`Alert`** — `elderId`, `type` (request | sos | missed_dose | missed_checkin), `severity`, `acknowledgedBy`, `acknowledgedAt`

---

## 🔧 Available Scripts

```bash
npm run dev     # Start with Nodemon (hot-reload)
npm start       # Start without hot-reload (production)
npm test        # Run tests (Node built-in test runner)
```

---

## 🌐 Socket.IO Events

The backend emits these events to the family room `elder:<elderId>`:

| Event | Payload | Trigger |
|---|---|---|
| `new-care-request` | `CareRequest` document | Chitti confirms a request |
| `alert:new` | `Alert` document | SOS or missed-dose alert |
| `dose:updated` | `DoseLog` document | Dose marked taken |

---

## 🛡️ Security Notes

- Helmet sets secure HTTP headers on every response
- CORS is locked to `FRONTEND_ORIGIN` only
- Rate limiting on `/api/v1/assistant/*` prevents abuse
- Zod validates all request bodies before they reach controllers
- Voice transcripts are stored only as summaries after 30 days
- Policy numbers are masked in list responses (shown only in detail view)
- All secrets are read from environment variables — never hardcoded
