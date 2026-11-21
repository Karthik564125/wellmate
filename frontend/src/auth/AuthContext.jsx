// Real Firebase auth context: holds the signed-in Firebase user, exposes
// sign-up/sign-in/sign-out and getIdToken() for the API client to use.
// This replaces the old "pick a role and go" demo login once pages are wired to it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { firebaseAuth } from "../firebase/firebaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The current Firebase user, or null when signed out. Starts null until
  // onAuthStateChanged fires once (loading distinguishes "not signed in" from
  // "haven't checked yet", so route guards don't flash a sign-in screen).
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    return credential.user;
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return credential.user;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    return credential.user;
  }, []);

  const signOutUser = useCallback(() => signOut(firebaseAuth), []);

  // forceRefresh: true bypasses the cached token (use after a role change, etc.).
  const getIdToken = useCallback(async (forceRefresh = false) => {
    if (!firebaseAuth.currentUser) return null;
    return firebaseAuth.currentUser.getIdToken(forceRefresh);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOutUser,
      getIdToken,
    }),
    [user, loading, signUpWithEmail, signInWithEmail, signInWithGoogle, signOutUser, getIdToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
