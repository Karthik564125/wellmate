# WellMate - Elder Dashboard and Chitti Voice Assistant

Audience: elder users (grandparents/parents) who may not know how to use a smartphone. Primary language Telugu; English secondary.
Status: PLANNING ONLY. No code yet.

## 1. Design principles

1. One tap or one voice command for anything important.
2. Home screen shows only a few big buttons and the mic button.
3. Every action is spoken back in Telugu and shown on screen.
4. Chitti always confirms before sending anything to family.
5. Nothing is hidden behind swipes, menus, or small icons.
6. If voice fails, the big buttons still work.

## 2. Home screen layout (elder view)

Top: large greeting in Telugu ("Namaskaram, <name> garu/amma/thaatha") and today's date.

Centre: very large round microphone button labelled "Chitti ni adagandi / Tap to talk to Chitti". Shows a pulsing animation while listening.

Below: 6 big buttons (each 48px+ touch target, icon + text):
1. Mandulu (Medicines) - today's list, mark as taken
2. Kutumbam (Family) - call or send a message request to family
3. Doctor - call local doctor from profile; see directory
4. Kirana / Grocery - ask for groceries
5. Recharge - ask family for phone recharge
6. SOS (red, always visible at bottom) - emergency alert and numbers

Bottom bar (always visible): "Sahayam / Help" (opens Chitti) and "Nearby Sahayam" (volunteers, auto and cab drivers).

Nearby Sahayam screen: list of volunteers, caretakers, auto drivers, cab drivers with name, big call button, area, availability. Shows "verified" badge if verified.

Profile card (small, on home or one tap away): name, photo, blood group, ongoing conditions, insurance summary (provider, helpline). Read-only for elder; family edits.

## 3. Chitti - how it is called

- Method A (always works): tap the big mic button.
- Method B (best effort): say "Chitti" when the phone allows listening. The app shows a small "Chitti vintunnadu / Listening" indicator when it hears the wake word.
- Wake word stops after a request is complete. Chitti never sends anything without confirmation.

## 4. Conversation flow (Telugu first)

Greeting (spoken and shown):
- Chitti: "Hello ammamma / thaatha, meeku em sahayam kavali?"
- (Telugu script to be checked by a native speaker before demo.)
- Shown options as big buttons: Mandulu ayyayaa? | Kutumbam tho matladali | Doctor ki call cheyali | Kirana saamaanu | Recharge | Vere samasya

Intent handling (examples):

A. Medicines
- Chitti: "Mee mandulu ayyayaa?" (Have your medicines been taken?)
- Elder: "Avunu" / "Ledu" / "Inka ledu"
- If yes: mark due doses as taken; reply "Baagundi, rikardu chesaanu." Family gets a notice "Medicines taken at <time>".
- If no: ask "Ee mandu? Eppudu teesukuntaaru?" (Which medicine? When will you take it?) Then create a request: medicine_pending. Family gets an alert.

B. Talk to family
- Chitti: "Ippudu kutumbam ki call cheddamaa, leka message pampamaa?" (Call now, or send a message?)
- Call: show family contact from profile; big call button.
- Message: ask "Em cheppali?" (What should I say?), elder speaks, Chitti reads it back, asks "Pampala?" (Send?). On yes: email + popup to family with the message.

C. Call local doctor
- Chitti: "Doctor ki call cheddamaa? Mee doctor gari number undi." (Shall I call your doctor? The number is listed.)
- Shows doctor name and big call button. If no doctor saved: "Doctor details profile lo lekhu. Kutumbam ni adagamantara?" (No doctor saved; ask family to add.) Creates a request.
- Chitti never gives a diagnosis or medicine advice. If symptoms are mentioned (chest pain, breathlessness, fall, unconscious, bleeding): switch to SOS flow immediately.

D. Grocery (kirana)
- Chitti: "Emi kavali? Cheppandi." (What do you need?)
- Elder speaks items. Chitti reads back list: "Biyyam, pappu, nune. Ivanni kavala?" (Rice, dal, oil. Are these right?)
- Asks: "Ekkada teesukovaali? Nearby kirana or volunteer?" (Where to get? Shows nearby volunteers.)
- On confirm: Request type grocery with items; family gets email + popup; family can call a volunteer from directory.

E. Recharge
- Chitti: "Phone recharge kavala? Entha roju / ekkada?" (Do you need phone recharge? For how many days?)
- Create Request type recharge; family popup; optional: show cab/auto driver list if elder needs to go to shop.

F. Transport (auto/cab)
- Chitti: "Auto kaavala, leka cab?" (Auto or cab?) Shows nearby auto and cab drivers with call buttons.

G. SOS / emergency (overrides everything)
- Trigger words (Telugu and English): "help", "SOS", "naaku bagaledu" (I am unwell), "kindapaddaanu" (I have fallen), "chest noppi" (chest pain), "oopiri ledu" (can't breathe), "rakthamu" (bleeding), "spruhaledu" (unconscious).
- Action: full-screen red SOS screen; sound and vibration; sends SOS alert to all family with email + popup; shows emergency numbers (108 ambulance, 112 general emergency, and profile emergency contacts); shows insurance provider and policy number from profile.
- Stays on screen until elder taps "Sahayam vachindi / Help has come" or family acknowledges.

H. Other / unknown
- Chitti: "Ardham kaaledu. Malli cheppandi, leka mee kutumbam ki cheppamantara?" (I did not understand. Say again, or shall I tell family?)
- After two failed attempts: show big buttons and offer "Kutumbam ki cheppu".

## 5. Follow-up questions (rules)

- Chitti asks at most 2 follow-up questions per request.
- Each question has a yes/no or a short tap choice where possible.
- After collecting details, Chitti reads a summary and asks: "Kutumbam ki pampamaa?" (Send to family?)
- Only on explicit yes does the request go out.
- Elder can say "vaddu" (no) or "cancel" at any point.

## 6. How requests reach family

- Request is saved (type, details, transcript, time, elder name).
- Email to all active linked family members with a short summary in English (and Telugu line if available).
- In-app popup on the family dashboard if they are logged in (Socket.IO event or polling fallback). Popup shows: elder name, request type, details, time, Acknowledge button.
- Family taps "Acknowledge" -> elder hears "Kutumbam ki cheppesaamu" (I have told your family).
- Unacknowledged SOS repeats email every 5 minutes (phase 2 for reminders; hackathon: send once plus popup).

## 7. Voice technology (hackathon)

- Speech to text: browser SpeechRecognition with language te-IN; fallback en-IN.
- Text to speech: browser SpeechSynthesis with te-IN voice when available; fallback en-IN.
- Intent detection: keyword matching in Telugu and English first (simple and reliable). Upgrade to an LLM intent parser later if time allows.
- Keep a `voice/` module with functions: startListening, stopListening, speak, detectIntent. Provider can be swapped later.
- If Telugu voice is not installed on the phone, show the Telugu text on screen and speak in English; warn family in setup.

## 8. Accessibility for elders

- Font size: body 20px, buttons 24px+, option to increase (large / extra large).
- High contrast mode by default; colours: avoid red/green only pairs.
- Each screen has one main action.
- Sounds: gentle chime for reminders; alarm tone for SOS.
- Vibration on alarms where supported.
- Screen never times out during an active SOS or Chitti session.

## 9. Data captured for elder dashboard

- Chitti session: transcript, detected intent, answers to follow-up questions, time.
- Request: type, details, status (open, acknowledged, done), handledBy.
- Dose log: taken/missed status with time.
- Alert: type, severity, time, acknowledgedBy.
- Transcripts kept for limited days (e.g., 30); only the summary kept after that.

## 10. What the family sees for this elder

- Open requests and alerts with time.
- Today's medicines: taken / pending / missed.
- Chitti conversation summary (not raw audio).
- Elder profile summary including ongoing conditions and insurance header.
- Nearby helpers and drivers used for this elder (from directory).

## 11. Nearby helpers and drivers (elder dashboard and family dashboard)

Directory categories:
- Volunteers (local helpers who visit or help with errands)
- Local caretakers (paid or unpaid, with availability)
- Auto drivers (name, vehicle number, phone, area, typical hours)
- Cab drivers (name, vehicle type, phone, area, availability)
- Doctors (phase 1: list from elder profile; phase 2: area directory)

Each entry shows: name, phone (big call button), area/location, availability (e.g., "Morning 7-10"), verified badge with last checked date.

Family dashboard: can add/edit entries for their area, and see which were used.
Elder dashboard: read-only list, filtered by distance or village/area.
Admin: verifies entries before they appear as "verified".

Privacy: entries are listed only after the person consents. Phone numbers are shown only to logged-in elders and family.

## 12. Error handling

- Mic not allowed: show big message in Telugu "Microphone allow cheyyandi" and show the big buttons.
- No internet: keep SOS button working by showing emergency numbers offline; queue the request and send when online; tell elder "Internet ledu, taruvata pamputaanu".
- Speech not recognised: after 2 tries, show options.
- Family email fails: popup still shown; log the failure.

## 13. Hackathon scope for the elder dashboard

Must have (P0):
- Home screen with mic button, 6 big buttons, SOS.
- Chitti greeting and Telugu/English speech in and out (browser).
- Medicine taken yes/no flow.
- Talk to family and grocery flows with confirmation.
- SOS flow with emergency numbers and family alert.
- Family email + popup.

Nice to have (P1):
- Wake word "Chitti".
- Nearby Sahayam directory screen.
- Doctor call flow with saved doctor.
- Recharge and transport flows.
- Font size switch.

Phase 2/3: voice chat for family without smartphone, LLM intent parsing, multi-language beyond Telugu/English, SMS alerts, helper task acceptance.

## 14. Demo script (for judges, about 2 minutes)

1. Show elder home screen with big buttons and mic.
2. Tap mic, say "Chitti". Chitti answers in Telugu: "Hello ammamma, meeku em sahayam kavali?"
3. Elder says "Mandulu vesukunnaanu" -> medicine marked taken; family view updates.
4. Elder says "Kirana kavali, biyyam, pappu" -> Chitti reads back, asks to confirm, elder says "avunu".
5. Show family dashboard: email received, popup appears, insurance summary in header, Acknowledge tapped, elder hears confirmation.
6. Trigger SOS demo: red screen, emergency numbers, family alert.
7. Show Nearby Sahayam list with volunteers, auto and cab drivers.
