# 🏥 WellMate

> **"Medicines on time, help one tap or one voice command away, and family always in the loop."**

WellMate is a full-stack elder-care web application that helps older adults manage daily life safely and independently, while keeping family caregivers informed without constant phone calls. Its signature feature is **Chitti** — a bilingual (Telugu/English) voice assistant built for elderly users.

---

## ✨ Features

### 🎙️ Chitti — Voice Assistant for Elders
- One-tap microphone button (or wake word "Chitti")
- Speaks and understands **Telugu** and **English** (te-IN / en-IN)
- Powered by **Sarvam AI** (Saaras v4 STT · Bulbul v4 Flash TTS) + Groq intent extraction
- Handles: medicines, grocery requests, family calls, doctor calls, recharge, transport, and SOS
- Always confirms before sending anything to the family

### 👴 Elder Dashboard
- Large text (20 px+ body, 24 px+ buttons), high contrast, 48 px minimum touch targets
- Six big-button shortcuts: Medicines · Family · Doctor · Grocery · Recharge · SOS
- Real-time dose tracking — mark medicines taken with one tap
- SOS button: full-screen alert, emergency numbers (108/112), family notified instantly

### 👨‍👩‍👧 Family Dashboard
- Overview of all linked elders: medicines today, open requests, alerts
- Insurance summary header (provider, policy status, helpline number)
- Real-time push notifications via **Socket.IO** + email alerts via **Resend**
- Acknowledge requests and assign care tasks

### 🩺 Health & Profile Management
- Elder profile: name, photo, blood group, allergies, address
- Ongoing conditions (diabetes, BP, arthritis, etc.)
- Doctors list with specialty and contact
- Emergency contacts (priority-ordered)
- Insurance policies (Ayushman Bharat, private, government schemes)

### 💊 Medicine Manager
- Add medicines with dose, form, times, start/end date
- Daily dose log — taken / pending / missed / skipped
- Family sees real-time adherence status

### 📅 Appointments
- Schedule and track doctor appointments
- Role-based views (elder, family, caretaker, admin)

### 🚗 Care Directory
- Nearby volunteers, local caretakers, auto/cab drivers
- Verified badges, availability hours, big call buttons
- Admin-managed, consent-based listings

### 🌐 Multilingual
- Telugu (primary — all elder screens and Chitti speech)
- English (all screens; language toggle for family dashboard)
- Custom i18n context (LanguageContext) with translation resource files

---

## 🏗️ Architecture

```
wellmate/
├── frontend/          # React 19 + Vite — elder, family, caretaker, volunteer, admin UIs
├── backend/           # Node.js + Express — REST API, Socket.IO, AI orchestration
└── wellmateInfo/      # Planning docs, product specs, dashboard designs
```

```
flowchart LR
  Elder["👴 Elder (browser/PWA)"]
  Family["👨‍👩‍👧 Family (browser)"]
  FE["React Frontend\n(Vite · Firebase Auth)"]
  BE["Express Backend\n(Node.js · Socket.IO)"]
  DB[("MongoDB Atlas")]
  Sarvam["Sarvam AI\n(STT / TTS / Samvaad)"]
  Groq["Groq LLM\n(Intent extraction)"]
  Firebase["Firebase Auth"]
  Resend["Resend\n(Email alerts)"]

  Elder --> FE --> BE --> DB
  Family --> FE
  BE --> Sarvam
  BE --> Groq
  BE --> Resend
  FE <--> Firebase
  BE --> Firebase
  BE -- "Socket.IO" --> Family
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router v7, custom i18n |
| **Authentication** | Firebase Authentication (Google + email/password) |
| **Backend** | Node.js, Express 5, Helmet, CORS, express-rate-limit |
| **Database** | MongoDB Atlas + Mongoose |
| **Voice STT/TTS** | Sarvam AI (Saaras v4 · Bulbul v4 Flash) |
| **Voice Agent** | Sarvam Samvaad (Chitti conversational agent) |
| **AI Intent** | Groq LLM (structured intent extraction) |
| **Email** | Resend |
| **Realtime** | Socket.IO |
| **Validation** | Zod |
| **Image uploads** | Cloudinary (phase 2) |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Elder** | Own dashboard, Chitti voice, medicines, appointments, SOS |
| **Family** | Linked elder overview, requests, alerts, insurance, care team |
| **Caretaker** | Assigned elder tasks, medicines, appointments |
| **Volunteer** | Help requests, assigned elder list |
| **Admin** | User management, care assignments, directory, appointments |

---

## 🗂️ Data Models (MongoDB Collections)

| Collection | Purpose |
|---|---|
| `User` | Firebase-linked accounts with role |
| `Elder` | Elder profile (DOB, blood group, allergies, address) |
| `CareLink` | Elder ↔ family member relationship + permissions |
| `CareRequest` | Requests created via Chitti or manual (grocery, medicine, etc.) |
| `CareAssignment` | Caretaker task assignments |
| `Condition` | Ongoing health conditions per elder |
| `Doctor` | Doctors linked to an elder |
| `EmergencyContact` | Priority-ordered emergency contacts |
| `InsurancePolicy` | Health insurance policies |
| `Medicine` | Prescribed medicines with schedule |
| `DoseLog` | Daily dose taken/missed tracking |
| `Appointment` | Doctor appointments |
| `Conversation` | Chitti session state (multi-turn dialogue) |
| `Alert` | SOS, missed-dose, care-request alerts |
| `Notification` | Email/in-app notification records |
| `Caretaker` | Caretaker directory entries |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)
- A [Firebase](https://console.firebase.google.com/) project with Authentication enabled
- API keys for Groq, Sarvam AI, and Resend

### 1. Clone the repository

```bash
git clone <repo-url>
cd Wellmate
```

### 2. Start the backend

```bash
cd backend
cp .env.example .env      # fill in all required values
npm install
npm run dev               # starts on http://localhost:5000
```

### 3. Start the frontend

```bash
cd frontend
# create frontend/.env with VITE_FIREBASE_* vars (see frontend/README.md)
npm install
npm run dev               # starts on http://localhost:5173
```

> [!IMPORTANT]
> The backend's CORS is locked to `http://localhost:5173`. Do **not** let Vite drift to another port (`strictPort: true` enforces this).

---

## 📡 API Overview (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/me` | Current user + role |
| `POST` | `/auth/register` | Register & link Firebase user |
| `GET/PUT` | `/elders/:id/profile` | Elder profile |
| `GET/POST` | `/elders/:id/conditions` | Ongoing conditions |
| `GET/POST` | `/elders/:id/insurance` | Insurance policies |
| `GET/POST` | `/elders/:id/medicines` | Medicine list |
| `GET` | `/elders/:id/doses?date=` | Doses for a date |
| `POST` | `/doses/:id/take` | Mark dose taken |
| `POST` | `/elders/:id/chitti/message` | Send voice transcript to Chitti |
| `POST` | `/elders/:id/chitti/confirm` | Confirm and dispatch Chitti request |
| `GET` | `/elders/:id/requests` | Open care requests |
| `POST` | `/requests/:id/ack` | Acknowledge a request |
| `POST` | `/elders/:id/sos` | Trigger SOS alert |
| `GET` | `/elders/:id/alerts` | Elder alerts |
| `POST` | `/care-links/invite` | Invite a family member |
| `POST` | `/care-links/accept` | Accept family invite |
| `GET` | `/family/dashboard` | All linked elders summary |
| `GET` | `/sarvam/session` | Sarvam Samvaad session ticket |

---

## 🔐 Security

- HTTPS everywhere in production
- Firebase ID tokens verified on **every** backend request
- Role + elder-link permission checks on all endpoints
- Health and insurance data masked by role
- Voice transcripts auto-deleted after 30 days
- Secrets only in `.env` (never committed)
- Rate limiting on AI/assistant endpoints
- India DPDP Act 2023 compliance target for public launch

---

## 📋 Chitti Voice Pipeline

```
Grandma speaks (Telugu)
      │
      ▼
Sarvam STT  ──▶  Transcript text
      │
      ▼
Groq LLM  ──▶  Structured intent JSON
  { intent, details, missingFields, requiresConfirmation }
      │
      ▼
Node.js  ──▶  Validate fields & permissions
      │          │
      │       Ask follow-up / Confirm
      │
      ▼
Save CareRequest in MongoDB
      │
      ├──▶  Socket.IO  ──▶  Family dashboard (live popup)
      └──▶  Resend     ──▶  Family email notification
```

The LLM **only extracts intent** — it never executes DB queries or bypasses permissions. Node.js is the sole decision-maker for all actions.

---

## 📂 Project Docs (`wellmateInfo/`)

| File | Contents |
|---|---|
| [`PROJECT_INFO.md`](wellmateInfo/PROJECT_INFO.md) | Full product spec, data models, API outline, security, timeline |
| [`ELDER_DASHBOARD.md`](wellmateInfo/ELDER_DASHBOARD.md) | Elder UX design, Chitti conversation flows, accessibility rules |
| [`FRONTEND_PLAN.md`](wellmateInfo/FRONTEND_PLAN.md) | Frontend build order, API contracts, open decisions |
| [`Complete_productinfo.md`](wellmateInfo/Complete_productinfo.md) | Detailed voice pipeline, architecture guidance |
| [`Wellmate_SKILLS.md`](wellmateInfo/Wellmate_SKILLS.md) | AI/voice skills reference |

---

## 📄 License

ISC
