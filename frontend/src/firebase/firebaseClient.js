// Firebase client SDK initialisation (browser side only). Public web config,
// not a secret - see frontend/.env.example for where these values come from.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId"];
const missing = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);
if (missing.length > 0) {
  // Fail loudly and early, in the same spirit as the backend's env.js: a
  // blank sign-in screen with no error is much harder to debug than this.
  throw new Error(
    `Missing Firebase config: ${missing.map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`).join(", ")}. Check frontend/.env (see .env.example).`
  );
}

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
