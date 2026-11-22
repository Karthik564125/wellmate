# WellMate — Frontend

React 19 + Vite web application for the WellMate elder-care platform. Provides role-specific dashboards for elders, family members, caretakers, volunteers, and admins — with Chitti voice integration powered by Sarvam AI.

---

## 🛠️ Tech Stack

| Concern | Technology |
|---|---|
| Framework | React 19 |
| Bundler | Vite 8 (strict port 5173) |
| Routing | React Router v7 |
| Authentication | Firebase (email/password + Google) |
| Voice agent | Sarvam ConvAI SDK (`sarvam-conv-ai-sdk`) |
| Linting | oxlint |
| i18n | Custom `LanguageContext` (Telugu + English) |

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── main.jsx                    # App entry — provider tree
│   ├── App.jsx                     # Route definitions
│   ├── App.css / index.css         # Global styles
│   │
│   ├── auth/
│   │   └── AuthContext.jsx         # Firebase auth state (currentUser, signIn, signOut)
│   │
│   ├── context/
│   │   ├── RoleContext.jsx         # Active role + elder selection
│   │   ├── EmergencyAlertContext.jsx # SOS alert state (global overlay)
│   │   └── CareRequestContext.jsx  # Open care requests + Socket.IO listener
│   │
│   ├── i18n/
│   │   ├── LanguageContext.jsx     # Telugu / English toggle
│   │   └── translations.js         # All UI strings keyed by language
│   │
│   ├── firebase/
│   │   └── firebaseClient.js       # Firebase app + auth initialization
│   │
│   ├── voice/
│   │   ├── chittiVoice.js          # Sarvam STT/TTS + intent send helpers
│   │   └── chittiDemoEngine.js     # Demo/mock voice engine (offline testing)
│   │
│   ├── routes/
│   │   └── navConfig.js            # Sidebar nav links per role
│   │
│   ├── components/                 # Shared UI components
│   │   ├── AppLayout.jsx           # Sidebar + Topbar shell
│   │   ├── Sidebar.jsx             # Role-aware navigation sidebar
│   │   ├── Topbar.jsx              # Header with language switcher + user menu
│   │   ├── Avatar.jsx
│   │   ├── Badge.jsx
│   │   ├── Card.jsx
│   │   ├── ChittiLauncher.jsx      # Floating mic button (Chitti entry point)
│   │   ├── EmptyState.jsx
│   │   ├── LanguageSwitcher.jsx    # Telugu ↔ English toggle
│   │   ├── Modal.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── RoleSelect.jsx          # Role picker at first login
│   │   ├── SarvamCall.jsx          # Sarvam ConvAI voice session widget
│   │   ├── SectionHeader.jsx
│   │   ├── StatCard.jsx
│   │   ├── Tabs.jsx
│   │   ├── Timeline.jsx
│   │   └── ToastProvider.jsx       # In-app toast notifications
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx / .css  # Public marketing / onboarding page
│   │   ├── AuthLayout.jsx / .css   # Wraps sign-in and sign-up forms
│   │   ├── SignInPage.jsx
│   │   ├── SignUpPage.jsx
│   │   ├── ProfilePage.jsx         # User + elder profile editor
│   │   ├── MedicinesPage.jsx       # Medicine list + mark-taken
│   │   ├── AppointmentsPage.jsx    # Appointment scheduler
│   │   ├── CareTeamPage.jsx        # Linked care team (caretakers, volunteers)
│   │   ├── InsurancePage.jsx       # Insurance policies
│   │   ├── CabPage.jsx             # Nearby auto/cab directory
│   │   ├── ChittiPage.jsx          # Full-screen Chitti voice session
│   │   ├── AddFamilyMemberPage.jsx # Invite / link a family member
│   │   ├── ConnectElderPage.jsx    # Link to an existing elder
│   │   ├── ModulePage.jsx          # Generic module container
│   │   └── dashboards/
│   │       ├── ElderDashboard.jsx      # Elder home: big buttons, Chitti mic, SOS
│   │       ├── FamilyDashboard.jsx     # Family overview: requests, alerts, medicines
│   │       ├── CaretakerDashboard.jsx  # Caretaker task view
│   │       ├── VolunteerDashboard.jsx  # Volunteer help requests
│   │       └── AdminDashboard.jsx      # Admin user/assignment management
│   │
│   ├── data/
│   │   └── mockData.js             # Offline demo data (used by demo engine)
│   │
│   └── assets/
│       ├── wellmate.jpeg           # Brand logo
│       ├── wellmate-icon.jpeg      # Favicon / app icon
│       └── vite.svg
│
├── vite.config.js                  # Vite config (strictPort: 5173)
├── index.html
└── package.json
```

---

## ⚙️ Environment Variables

Create `frontend/.env` with the following Firebase config (get from Firebase console → Project settings → Your apps):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

> [!CAUTION]
> Only `VITE_`-prefixed variables are exposed to the browser bundle. Never put secret keys in frontend env vars.

---

## 🚀 Setup & Running

### Prerequisites
- Node.js ≥ 18
- Backend running at `http://localhost:5000` (see `backend/readme.md`)

### Install & start

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

### Lint

```bash
npm run lint       # oxlint
```

> [!IMPORTANT]
> Vite is configured with `strictPort: true`. If port 5173 is already in use the server will **fail** rather than silently picking another port — the backend's CORS is pinned to exactly this origin.

---

## 🌐 Provider Tree

The app wraps everything in this provider order (see [`main.jsx`](src/main.jsx)):

```
BrowserRouter
  └─ AuthProvider          (Firebase auth state)
       └─ LanguageProvider (Telugu / English)
            └─ RoleProvider (active role + elder)
                 └─ EmergencyAlertProvider (SOS overlay)
                      └─ CareRequestProvider (live requests)
                           └─ ToastProvider
                                └─ App (routes)
```

---

## 👥 Role-Based Navigation

Sidebar links are driven by [`navConfig.js`](src/routes/navConfig.js) keyed to the active role:

| Role | Sidebar links |
|---|---|
| **elder** | Today (dashboard) · Add Family Member · Medicines · Appointments · Emergency · Profile |
| **family** | Overview · Connect Elder · Medicines · Appointments · Care Team · Insurance · Profile |
| **caretaker** | Dashboard · Medicines · Appointments · Care Team · Profile |
| **volunteer** | Dashboard · Help Requests · Elders · Profile |
| **admin** | Dashboard · Users/Assignments · Appointments · Cab/Transport · Insurance · Profile |

---

## 🎙️ Chitti Voice Integration

Chitti is the voice assistant for elder users. The frontend handles two modes:

### 1. Sarvam ConvAI (production)

`SarvamCall.jsx` and the `sarvam-conv-ai-sdk` package connect to the Sarvam Samvaad real-time voice agent:

1. Frontend calls `GET /api/v1/sarvam/session` to get a short-lived session ticket.
2. `SarvamCall` opens a WebRTC/WS session with the Sarvam runtime.
3. Elder speaks Telugu → Sarvam handles STT, Chitti LLM intent, TTS in one round-trip.
4. Frontend receives the action result and updates local state.

### 2. Demo engine (offline / fallback)

`chittiDemoEngine.js` simulates the full Chitti dialogue using `mockData.js` — no network calls needed. Used for hackathon demos without live API keys.

### Voice helper module (`chittiVoice.js`)

Exports: `startListening(lang)` · `stopListening()` · `speak(text, lang)` · `sendTranscript(elderId, text)` · `confirmIntent(elderId, conversationId)`

The voice provider is swappable — the rest of the app imports only from this module.

---

## 🌍 Internationalisation (i18n)

WellMate uses a custom `LanguageContext` (not `react-i18next`).

- All UI strings live in [`translations.js`](src/i18n/translations.js) keyed as `{ te: {...}, en: {...} }`.
- `useLanguage()` hook returns `{ t, language, setLanguage }`.
- Elder-facing screens and all Chitti speech default to Telugu (`te`).
- Family dashboard defaults to English with a toggle in the topbar.

**Adding a new string:**
1. Add the key under both `te` and `en` in `translations.js`.
2. Use `t('your.key')` in the component.

---

## 📱 Pages & Dashboards

### Elder Dashboard (`/dashboard/elder`)
- Large greeting in Telugu with today's date
- Giant pulsing **Chitti mic button** (`ChittiLauncher`)
- 6 big-button shortcuts: Medicines · Family · Doctor · Grocery · Recharge · SOS
- SOS button triggers `EmergencyAlertContext` → full-screen red overlay + API call

### Family Dashboard (`/dashboard/family`)
- Insurance summary header (provider, expiry, helpline)
- Today's medicines strip (taken / pending / missed per elder)
- Open care requests list with Acknowledge button
- Alert feed
- Real-time updates via `CareRequestContext` (Socket.IO listener)

### Caretaker Dashboard (`/dashboard/caretaker`)
- Assigned elder tasks and upcoming doses

### Volunteer Dashboard (`/dashboard/volunteer`)
- Open help requests that volunteers can accept
- Elders list (`/dashboard/volunteer/elders`)

### Admin Dashboard (`/dashboard/admin`)
- User management and care assignments

---

## 🔥 Firebase Authentication

`AuthContext.jsx` wraps Firebase auth and exposes:

```js
const { currentUser, loading, signIn, signUp, signOut, getIdToken } = useAuth();
```

Every API call adds:
```
Authorization: Bearer <Firebase ID token>
```

The token is refreshed automatically by the Firebase SDK before expiry.

---

## 🔔 Real-time Notifications

`CareRequestContext.jsx` connects to the backend Socket.IO server and listens on events:

| Event | Action |
|---|---|
| `new-care-request` | Prepend to open requests list + show toast |
| `alert:new` | Show emergency toast / SOS overlay |
| `dose:updated` | Refresh today's dose strip |

---

## 🧪 Testing

Testing uses **React Testing Library** + Jest. The plan calls for 3–4 test cases per dashboard/screen covering:

- Renders without crashing
- Role-gated content is visible / hidden correctly
- Key user interactions (mark dose taken, acknowledge request, trigger SOS)
- Chitti launcher opens voice session

```bash
# (once test runner is wired)
npm test
```

---

## 🚢 Deployment

| Target | Recommended platform |
|---|---|
| Frontend | Vercel or Netlify (auto-deploy from `main` branch) |
| Backend | Render or Railway |

Set all `VITE_*` env vars in the platform's environment settings. The `dist/` output is a static SPA — configure the host to redirect all paths to `index.html` for client-side routing.

---

## 🎨 UX Rules (Elder Accessibility)

These rules are enforced across all elder-facing screens:

- Body text ≥ 20 px · Button labels ≥ 24 px
- Touch targets ≥ 48 px
- High contrast by default
- Icon + text label on every button (never icon-only)
- Maximum 6 choices per screen
- Confirm before any destructive action
- Chitti always reads back a summary and asks confirmation before sending to family
- SOS screen stays on until acknowledged (no auto-dismiss)
- Screen does not time out during an active Chitti or SOS session
