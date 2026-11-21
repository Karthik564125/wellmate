// One fetch wrapper for every backend call. Adds "Authorization: Bearer
// <Firebase ID token>" automatically, points at /api/v1, and turns the
// backend's { error: { code, message, details } } shape into a thrown
// ApiError so callers can check err.code / err.status.

import { firebaseAuth } from "../firebase/firebaseClient.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, headers = {}, auth = true, ...rest } = {}) {
  const finalHeaders = { ...headers };
  let finalBody = body;

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  if (auth && firebaseAuth.currentUser) {
    const token = await firebaseAuth.currentUser.getIdToken();
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
    ...rest,
  });

  if (response.status === 401) {
    // The backend no longer accepts this session; clear it locally and send
    // the user back to sign in, per the frontend plan for 401 handling.
    await firebaseAuth.signOut().catch(() => {});
    if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
      window.location.assign("/signin");
    }
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null; // Non-JSON body (rare); handled as "no payload" below.
    }
  }

  if (!response.ok) {
    const err = payload?.error ?? {};
    throw new ApiError(
      response.status,
      err.code ?? "UNKNOWN",
      err.message ?? response.statusText,
      err.details ?? {}
    );
  }

  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
