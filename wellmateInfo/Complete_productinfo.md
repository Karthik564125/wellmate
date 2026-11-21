I want you to understand one important concept first:

Chitti is not just a voice chatbot. Chitti is a voice interface that converts what Grandma says into a structured request, and your Node.js backend safely performs the action.

Let's design this around one real example: Grandma says, "Naaku mandulu aipothunnayi" (My medicines are running out).
1. Recommended technology stack
Frontend
Your strength











React + Vite + Tailwind CSS

Elder dashboard, family dashboard, microphone and voice interaction.



Authentication










Firebase Authentication

Google, email/password and phone sign-in options.



Backend










Node.js + Express.js

Authentication verification, permissions, AI orchestration, APIs and business logic.



Database










MongoDB Atlas + Mongoose

Users, elder profiles, family relationships, requests, tasks, medicines and timeline.



AI and voice










LLM with structured output

Understand the request and return a structured intent.












Speech-to-text + Text-to-speech

Convert Telugu voice to text and Chitti's response back to Telugu audio.



Other services
- Cloudinary — prescription and report uploads.
- Socket.IO — real-time family dashboard updates.
- Resend — email notifications.
- Jest + React Testing Library — tests.

My authentication recommendation: Firebase Authentication.

Why?
- You don't have to implement password handling yourself.
- You can use Google and email authentication.
- Phone authentication is available for future elder access.
- Your Node.js backend can verify Firebase ID tokens using Firebase Admin SDK. 
  Firebase+1
Clerk is another good option, especially if you want a polished ready-made authentication UI and organisation-based permissions. 
Clerk Docs+1


For your short hackathon, I'd choose Firebase Auth.
2. First understand the complete voice pipeline
This is the most important part of Wellmate.
Grandma speaks → Family receives request
1. Grandma speaks

"Naaku mandulu aipothunnayi"


2. Speech-to-Text (STT)

Telugu audio → Telugu text

"My medicines are running out"


3. LLM understands the intent

Recognises medicine refill request
medicine_refill


4. Node.js validates the request

Checks user, elder, permissions and missing details


5. Chitti asks a follow-up

"Which medicine do you need, Grandma?"


6. Grandma confirms

Chitti reads the request back before submitting


7. MongoDB saves the request

Care request + status + timestamp


8. Family dashboard updates

Socket.IO + email notification


There are four different technologies involved in the voice part:
Technology	Responsibility
STT	Audio → text
LLM	Text → intent and extracted details
Node.js	Validates and executes actions
TTS	Chitti's response text → audio

Do not confuse the LLM with the speech recognition system. They solve different problems.
3. Let's implement Grandma's medicine request
Imagine Grandma taps the microphone and says:
"Naaku mandulu aipothunnayi."

Step 1: React captures her voice
For the first prototype, try the browser's Web Speech API. It supports speech recognition and speech synthesis, but browser and language support varies. Test Telugu (te-IN) on your actual demo device. 
MDN+1


Example:

const recognition = new window.webkitSpeechRecognition();

recognition.lang = "te-IN";
recognition.continuous = false;
recognition.interimResults = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;

  console.log("Grandma said:", transcript);

  sendToBackend(transcript);
};

function startListening() {
  recognition.start();
}



Your microphone button calls startListening().

For browsers without reliable Telugu recognition, replace this with a dedicated speech-to-text API. Keep the rest of your pipeline unchanged.
Step 2: Send the transcript to Node.js
React sends the recognised text to your backend.

async function sendToBackend(transcript) {
  const token = await auth.currentUser.getIdToken();

  const response = await fetch(
    "/api/assistant/turn",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        elderId: "elder123",
        message: transcript,
        language: "te-IN"
      })
    }
  );

  const data = await response.json();

  console.log(data);
}



auth.currentUser represents the signed-in Firebase user. The backend must verify that user's token before processing the request.
Step 3: The LLM converts text into a decision
This is where the AI comes in.

You send the transcript to your LLM with instructions such as:

"You are Chitti, a Telugu and English family-care assistant. Identify the user's intent. Return structured JSON. Never invent missing medicine details. Do not give medical advice."

Suppose the LLM returns:
{
  "intent": "medicine_refill",
  "confidence": 0.96,
  "details": {
    "medicineName": null,
    "quantity": null
  },
  "missingFields": [
    "medicineName"
  ],
  "requiresConfirmation": true
}


Notice something important:

The AI did not guess the medicine name.

It recognised the intent and identified the missing information.

This is called structured output or intent extraction.

You can use an LLM provider that supports schema-constrained structured outputs. You don't need LangChain or LangGraph for this first version.
Step 4: Node.js decides what to do
Your backend receives the structured output and checks the result.

For example:
if (intent === "medicine_refill") {
  if (!details.medicineName) {
    return {
      status: "needs_information",
      reply: "Which medicine do you need, Grandma?"
    };
  }
}


Chitti then speaks:

"ఏ మందులు కావాలి అమ్మమ్మ?"

Which medicines do you need, Grandma?

The conversation is not finished yet. We need to remember that Grandma is answering a pending medicine request.
4. How do follow-up questions work?
This is an important part of your architecture.

You need a small conversation state stored in MongoDB.

For example:

{
  "conversationId": "conv123",
  "elderId": "elder123",
  "intent": "medicine_refill",
  "status": "collecting_details",
  "collectedDetails": {
    "medicineName": null,
    "quantity": null
  },
  "nextQuestion": "medicineName"
}



Now Grandma answers:

"BP medicine."

The backend knows that the conversation is waiting for the medicine name.

It updates the conversation and asks the next question if necessary.

For example:
- Grandma: "I need my BP medicine."
- Chitti: "Which medicine name, Grandma? Can you tell me or select it from your medicine list?"
- Grandma: "Example medicine A."
- Chitti: "Okay, shall I inform your family to arrange Example medicine A?"
- Grandma: "Yes."
Now the request can be submitted.

For your hackathon, use a controlled conversation flow with predefined required fields. You don't need a complex autonomous agent.
5. Save the request in MongoDB
Create a CareRequest model.

import mongoose from "mongoose";

const careRequestSchema = new mongoose.Schema({
  elderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Elder",
    required: true
  },

  requestedBy: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: [
      "medicine_refill",
      "grocery",
      "transport",
      "doctor",
      "family_call",
      "recharge",
      "other"
    ],
    required: true
  },

  details: {
    type: mongoose.Schema.Types.Mixed
  },

  status: {
    type: String,
    default: "new"
  },

  assignedTo: {
    type: String,
    default: null
  },

  confirmedAt: Date

}, { timestamps: true });

export default mongoose.model(
  "CareRequest",
  careRequestSchema
);



Example saved document:
{
  "elderId": "elder123",
  "requestedBy": "user456",
  "type": "medicine_refill",
  "details": {
    "medicineName": "Example medicine A",
    "quantity": "Not specified"
  },
  "status": "new",
  "assignedTo": null
}


The family dashboard can now display:
New medicine request
New

Grandma's request

Request: Example medicine A

Requested through: Chitti voice assistant

Assigned to: Not yet assigned

Status: Waiting for family

Accept task
Assign to family

Illustrative dashboard preview.

6. How does the family dashboard update automatically?
Use Socket.IO.

When Node.js saves a new request, it emits an event to the relevant family's room.

Backend:
io.to(`family:${familyId}`).emit(
  "new-care-request",
  savedRequest
);


React:
socket.on("new-care-request", (request) => {
  setRequests(prev => [request, ...prev]);

  // Show a notification
});


You can also send an email using Resend.

Important: Save the request first. Even if email or Socket.IO fails, the request must remain in MongoDB.
7. How does role-based access work?
You have multiple users, but they should not all see the same data.

I recommend these roles:
Elder

Can create requests, see own reminders and view request status.



Family member

Can view authorised elder information, manage requests and assign tasks according to permissions.



Volunteer

Can see only assigned tasks and necessary contact details.



Admin

Can manage users and directory listings.



How to store users
You can have a User collection:
{
  authUid: "firebase-user-id",
  name: "Ramesh",
  email: "ramesh@example.com",
  role: "family"
}


An Elder collection:
{
  name: "Grandma",
  preferredLanguage: "te",
  familyMembers: [
    {
      userId: "user456",
      relationship: "son",
      permissions: ["view_requests", "manage_tasks"]
    }
  ]
}


A family member may manage multiple elders. So don't rely on a single global role alone. Check the user's relationship and permissions for the specific elder.
Backend permission example
First verify Firebase authentication:

import admin from "firebase-admin";

async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthenticated"
      });
    }

    const decoded = await admin.auth()
      .verifyIdToken(token);

    req.user = {
      uid: decoded.uid
    };

    next();
  } catch {
    res.status(401).json({
      message: "Invalid authentication"
    });
  }
}



Then check whether the user is allowed to access the elder:
async function canAccessElder(userId, elderId) {
  const elder = await Elder.findOne({
    _id: elderId,
    "familyMembers.userId": userId
  });

  return Boolean(elder);
}


In the real implementation, check the specific permission too, not just membership.

Firebase verifies who the user is. Your application checks what that user is allowed to do. Firebase also supports custom claims for role-based access, but keeping family relationships and detailed permissions in MongoDB is more flexible here. 
Firebase+2


Very important: The AI must never decide whether someone has permission to access medical records. Your backend makes that decision.
8. How I would organise the backend
Keep your code organised by features rather than putting all logic in one controller.
backend/
│
├── models/
│   ├── User.js
│   ├── Elder.js
│   ├── CareRequest.js
│   ├── Conversation.js
│   ├── Task.js
│   └── Medicine.js
│
├── routes/
│   ├── auth.routes.js
│   ├── elder.routes.js
│   ├── assistant.routes.js
│   ├── request.routes.js
│   └── task.routes.js
│
├── controllers/
│   ├── assistant.controller.js
│   ├── request.controller.js
│   └── task.controller.js
│
├── services/
│   ├── speech.service.js
│   ├── ai.service.js
│   ├── request.service.js
│   ├── notification.service.js
│   └── permission.service.js
│
├── middleware/
│   ├── authenticate.js
│   └── authorize.js
│
└── server.js


9. What about medicine schedules and medicine completion?
One distinction: these are two separate intents.
Grandma says	Intent	Action
My medicine is running out	medicine_refill	Create refill request
I have taken my medicine	medicine_taken	Record a medicine activity
Remind me about my medicine	medicine_reminder	Check existing reminder settings
I need to know my medicine schedule	medicine_schedule_query	Read family-verified schedule

Don't mix them together.

For example, when Grandma says "I have taken my medicine", Chitti should ask which scheduled medicine if it is ambiguous. Once confirmed, record the event with the time and who reported it.

Do not change a prescription or create a new dosage schedule.

10. Your development order — what to build first
You and your intern should divide the work like this:
You — Frontend
- Firebase login UI and role-based routing.
- Elder dashboard.
- Chitti microphone and voice states.
- Telugu/English language selection.
- Family request dashboard.
- Socket.IO notification UI.

Your intern — Backend
- Firebase Admin authentication.
- MongoDB models.
- Role and elder-permission middleware.
- Assistant API and LLM integration.
- Conversation state management.
- Request/task APIs.
- Email and Socket.IO events.

Together
- Agree on API request/response formats.
- Test one complete medicine-request workflow.
- Test permissions with different accounts.
- Test Telugu voice recognition on the actual device.

11. Your first MVP API contract
Agree on these endpoints before parallel development:
Method	Endpoint	Purpose
POST	/api/assistant/turn	Send voice transcript to Chitti
GET	/api/assistant/conversations/:id	Retrieve pending conversation
POST	/api/assistant/confirm	Confirm an action
POST	/api/requests	Create manual request
GET	/api/requests	List authorised requests
PATCH	/api/requests/:id	Update request status
POST	/api/tasks	Assign a family task
GET	/api/elders/:id	Get permitted elder profile

My suggestion is to make /api/assistant/turn the main entry point for the voice workflow. It should return either a follow-up question, a confirmation request, or a successfully completed action.

12. The most important architecture decision
Don't allow the LLM to directly execute MongoDB queries or create requests whenever it thinks it understands something.

Use this architecture:
LLM: Understand and extract intent


Node.js: Validate fields and permissions


Ask follow-up / request confirmation


Node.js: Execute approved action


MongoDB + Family notification


This is a controlled AI workflow. It's easier to debug, safer, and much more suitable for your hackathon than building a complicated autonomous multi-agent system.
What I want you to build first
Only one feature:

Grandma taps microphone → speaks Telugu → Chitti understands → asks medicine name → Grandma confirms → MongoDB saves → family dashboard updates.

Once this works end-to-end, groceries, recharge, transport and family calls can reuse the same pipeline by adding new intent handlers.

That's the best way to avoid getting overwhelmed while still building something impressive