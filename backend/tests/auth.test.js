// Auth and permissions tests. Run with: node --test tests/auth.test.js
// No MongoDB or Firebase is needed: fake verifyIdToken, fake UserModel and fake CareLink are injected.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createAuthenticate, requireUser } from "../src/middleware/authenticate.js";
import { canAccessElder } from "../src/middleware/authorize.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { createAuthRouter } from "../src/routes/auth.routes.js";

// Valid 24-hex ObjectId strings (canAccessElder rejects malformed ids before querying).
const ELDER_ID = "64b000000000000000000001";
const USER_ID = "64b000000000000000000002";

const GOOD_TOKEN = "good-token";

// Fake verifyIdToken: accepts only GOOD_TOKEN and resolves to uid "uid-1".
async function verifyIdToken(token) {
  if (token === GOOD_TOKEN) return { uid: "uid-1" };
  throw new Error("invalid token");
}

// Fake User model. existing = the User found by findOne (null = no profile).
function fakeUserModel(existing = null) {
  return {
    findOne: async () => existing,
    create: async (doc) => ({ _id: USER_ID, ...doc }),
  };
}

// Fake CareLink model: findOne matches on elderId and userId as strings.
function fakeCareLink(links) {
  return {
    findOne: async ({ elderId, userId }) =>
      links.find((l) => l.elderId === elderId && l.userId === userId) ?? null,
  };
}

// Fake Elder model: findById by exact id match. Defaults to "no such elder"
// so these CareLink-focused tests exercise the CareLink path, not the owner bypass
// (see tests/elder.test.js for owner-bypass and route coverage).
function fakeElderModel(elder = null) {
  return {
    findById: async (id) => (elder && String(elder._id) === String(id) ? elder : null),
  };
}

// Build a small app with the real auth router and the real central error handler.
function buildAuthApp(deps) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/auth", createAuthRouter(deps));
  app.use(errorHandler);
  return app;
}

async function withServer(app, fn) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postRegister(base, body, token = GOOD_TOKEN) {
  return fetch(`${base}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

// ---- authenticate ----

test("missing token -> 401 UNAUTHENTICATED", async () => {
  const authenticate = createAuthenticate({ verifyIdToken, UserModel: fakeUserModel() });
  await assert.rejects(authenticate({ headers: {} }, {}, () => {}), (err) => {
    return err.statusCode === 401 && err.code === "UNAUTHENTICATED";
  });
});

test("bad token -> 401 UNAUTHENTICATED", async () => {
  const authenticate = createAuthenticate({ verifyIdToken, UserModel: fakeUserModel() });
  const req = { headers: { authorization: "Bearer bad-token" } };
  await assert.rejects(authenticate(req, {}, () => {}), (err) => {
    return err.statusCode === 401 && err.code === "UNAUTHENTICATED";
  });
});

test("valid token with no User -> req.user is null and next is called", async () => {
  const authenticate = createAuthenticate({ verifyIdToken, UserModel: fakeUserModel(null) });
  const req = { headers: { authorization: `Bearer ${GOOD_TOKEN}` } };
  let nextCalled = false;
  await authenticate(req, {}, () => {
    nextCalled = true;
  });
  assert.equal(req.auth.uid, "uid-1");
  assert.equal(req.user, null);
  assert.equal(nextCalled, true);
});

test("requireUser -> 401 UNAUTHENTICATED when req.user is null", () => {
  assert.throws(() => requireUser({ user: null }, {}, () => {}), (err) => {
    return err.statusCode === 401 && err.code === "UNAUTHENTICATED";
  });
});

// ---- canAccessElder ----

test("canAccessElder with no CareLink -> false", async () => {
  const result = await canAccessElder(USER_ID, ELDER_ID, "viewMedicines", {
    CareLink: fakeCareLink([]),
    Elder: fakeElderModel(),
  });
  assert.equal(result, false);
});

test("canAccessElder with revoked CareLink -> false", async () => {
  const CareLink = fakeCareLink([
    { elderId: ELDER_ID, userId: USER_ID, status: "revoked", permissions: ["viewMedicines"] },
  ]);
  const result = await canAccessElder(USER_ID, ELDER_ID, "viewMedicines", {
    CareLink,
    Elder: fakeElderModel(),
  });
  assert.equal(result, false);
});

test("canAccessElder with active CareLink lacking the permission -> false", async () => {
  const CareLink = fakeCareLink([
    { elderId: ELDER_ID, userId: USER_ID, status: "active", permissions: ["receiveAlerts"] },
  ]);
  const result = await canAccessElder(USER_ID, ELDER_ID, "viewMedicines", {
    CareLink,
    Elder: fakeElderModel(),
  });
  assert.equal(result, false);
});

test("canAccessElder with active CareLink holding the permission -> true", async () => {
  const CareLink = fakeCareLink([
    { elderId: ELDER_ID, userId: USER_ID, status: "active", permissions: ["viewMedicines"] },
  ]);
  const result = await canAccessElder(USER_ID, ELDER_ID, "viewMedicines", {
    CareLink,
    Elder: fakeElderModel(),
  });
  assert.equal(result, true);
});

test("canAccessElder with no permission requested but an active CareLink -> true", async () => {
  const CareLink = fakeCareLink([
    { elderId: ELDER_ID, userId: USER_ID, status: "active", permissions: [] },
  ]);
  const result = await canAccessElder(USER_ID, ELDER_ID, null, {
    CareLink,
    Elder: fakeElderModel(),
  });
  assert.equal(result, true);
});

test("canAccessElder with no CareLink but matching Elder.userId (owner) -> true", async () => {
  const elder = { _id: ELDER_ID, userId: USER_ID };
  const result = await canAccessElder(USER_ID, ELDER_ID, "editProfile", {
    CareLink: fakeCareLink([]),
    Elder: fakeElderModel(elder),
  });
  assert.equal(result, true);
});

// ---- POST /api/v1/auth/register ----

test("register with role volunteer -> 201 (self-registerable)", async () => {
  const app = buildAuthApp({
    authenticate: createAuthenticate({ verifyIdToken, UserModel: fakeUserModel(null) }),
    UserModel: fakeUserModel(null),
  });
  await withServer(app, async (base) => {
    const res = await postRegister(base, { name: "Sandeep", role: "volunteer" });
    assert.equal(res.status, 201);
  });
});

test("register with role caretaker -> 201 (self-registerable)", async () => {
  const app = buildAuthApp({
    authenticate: createAuthenticate({ verifyIdToken, UserModel: fakeUserModel(null) }),
    UserModel: fakeUserModel(null),
  });
  await withServer(app, async (base) => {
    const res = await postRegister(base, { name: "Kavitha", role: "caretaker" });
    assert.equal(res.status, 201);
  });
});

test("register with role admin -> 400 VALIDATION_FAILED (not self-registerable)", async () => {
  const app = buildAuthApp({
    authenticate: createAuthenticate({ verifyIdToken, UserModel: fakeUserModel(null) }),
    UserModel: fakeUserModel(null),
  });
  await withServer(app, async (base) => {
    const res = await postRegister(base, { name: "Root", role: "admin" });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });
});


test("register when a User already exists -> 409 CONFLICT", async () => {
  const existing = { _id: USER_ID, name: "Old", role: "elder", preferredLanguage: "te" };
  const app = buildAuthApp({
    authenticate: createAuthenticate({ verifyIdToken, UserModel: fakeUserModel(existing) }),
    UserModel: fakeUserModel(existing),
  });
  await withServer(app, async (base) => {
    const res = await postRegister(base, { name: "Asha", role: "elder" });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, "CONFLICT");
  });
});

test("register with a valid body -> 201 with the user", async () => {
  const app = buildAuthApp({
    authenticate: createAuthenticate({ verifyIdToken, UserModel: fakeUserModel(null) }),
    UserModel: fakeUserModel(null),
  });
  await withServer(app, async (base) => {
    const res = await postRegister(base, { name: "Asha", role: "elder", preferredLanguage: "en" });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.name, "Asha");
    assert.equal(body.user.role, "elder");
    assert.equal(body.user.preferredLanguage, "en");
    assert.equal(body.user.authUid, undefined);
  });
});
