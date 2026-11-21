# WellMate Frontend Plan

Based on wellmateInfo/PROJECT_INFO.md and frontend todo.md. Planning only; no code changes in this document.

## 1. Current state (from survey)
- React 19 + Vite app in frontend/, react-router-dom in use.
- Pages and dashboards exist as shells for elder, family, caretaker, admin, volunteer, medicines, appointments, care team, insurance, cab, profile.
- Custom i18n (LanguageContext.jsx), custom UI components, no UI library.
- Missing: Chitti voice, SOS, elder profile, invite/link family, directory, uploads, Firebase, React Query, PWA, real API calls.
- family-care-hub.html at project root is a static HTML prototype, not connected to the app.

## 2. Build order (frontend)
1. Foundations: confirm which existing pages are real vs shells; decide i18n library; add React Query; add API client module (frontend/src/api/); add auth wiring placeholder for Firebase.
2. Elder side: elder dashboard with big buttons; medicine manager with mark-taken; SOS button; elder profile (basic, conditions, doctors, contacts, insurance).
3. Chitti: voice service module (frontend/src/voice/), mic button, speech in and out, keyword intent detection, follow-up questions, confirmation step, send request.
i also want to add sarvam ai for voice agent to interact with eldery and add voice agent logo in family dashbaord
4. Family side: dashboard header with insurance summary; today's medicines; open requests; alerts; live popup; invite/link flow. and 2 real time family members 
5. P1: care directory, appointments reminders, Cloudinary uploads, other role dashboards.
6. Polish: elder UX rules (sizes, contrast, zoom), Telugu strings and native review, PWA, tests, lint and build, deploy.

7.main point -write test cases we need to integrate test library and add test cases for frontend add 3 to 4 test cases for every screen i.e every dashbaord this is compulsory we can use react testing library 

## 3. Interfaces the frontend will need from the backend (to be planned next)
- GET /api/v1/me
- GET/PUT /api/v1/elders/:id/profile; conditions; insurance; doctors; contacts
- GET/POST /api/v1/elders/:id/medicines; GET /api/v1/elders/:id/doses?date=; POST /api/v1/doses/:id/take
- POST /api/v1/elders/:id/chitti/message; POST /api/v1/elders/:id/chitti/confirm
- GET /api/v1/elders/:id/requests; POST /api/v1/requests/:id/ack; POST /api/v1/elders/:id/sos; GET /api/v1/elders/:id/alerts
- POST /api/v1/care-links/invite; POST /api/v1/care-links/accept; GET /api/v1/elders/:id/family
- GET /api/v1/family/dashboard
- GET /api/v1/directory?category=&area= (P1)

## 4. Decisions still open
- react-i18next vs keeping the custom context.--keep what is there already custom context
- Voice provider: browser Web Speech API first (default).---Voice provider	Sarvam AI	-- chosen Saaras v4 for speech-to-text and Bulbul v4 Flash for text-to-speech.
- Demo area and demo elder (PROJECT_INFO section 15).--
Demo area and demo elder	Use synthetic demo data	You need realistic scenarios without exposing real people's personal or medical information.also this data we need to add in backend so it will sync well

## 5. Done when
- Demo flow works end to end: elder taps mic, says Chitti, answers in Telugu, makes a grocery request, family sees popup and insurance summary, directory lists helpers (P1).
--- 