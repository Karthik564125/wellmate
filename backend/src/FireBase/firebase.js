// Firebase Admin SDK initialisation (server side only).
// Initialised lazily on first use so importing this module never throws,
// even when the FIREBASE_* env vars are absent (e.g. in tests).

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp = null;

export function getFirebaseAuth() {
  if (!adminApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // .env files store the key with literal "\n" sequences; convert them to real newlines.
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY"
      );
    }

    adminApp = getApps().length
      ? getApp()
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getAuth(adminApp);
}
