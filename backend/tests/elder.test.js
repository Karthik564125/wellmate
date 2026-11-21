// Elder profile route tests. Run with: node --test tests/elder.test.js
// No MongoDB or Firebase is needed: fake Firebase token verification, fake User,
// fake CareLink and fake Elder models are all injected.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import mongoose from "mongoose";

import { createAuthenticate } from "../src/middleware/authenticate.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { createElderRouter } from "../src/routes/elder.routes.js";

// canAccessElder rejects any id that isn't ObjectId-shaped before even
// looking it up, so fakes that create() new documents need real-looking ids.
function newFakeId() {
  return new mongoose.Types.ObjectId().toString();
}

const ELDER_ID = "64b000000000000000000001";
const MISSING_ELDER_ID = "64b000000000000000000099";
const OWNER_USER_ID = "64b000000000000000000011";
const FAMILY_VIEW_ID = "64b000000000000000000012";
const FAMILY_EDITOR_ID = "64b000000000000000000013";
const UNLINKED_USER_ID = "64b000000000000000000014";
const ADMIN_USER_ID = "64b000000000000000000015";
const VOLUNTEER_USER_ID = "64b000000000000000000016";

const TOKENS = {
  owner: "tok-owner",
  familyView: "tok-family-view",
  familyEditor: "tok-family-editor",
  unlinked: "tok-unlinked",
  admin: "tok-admin",
  volunteer: "tok-volunteer",
};

const USERS_BY_UID = {
  [TOKENS.owner]: { _id: OWNER_USER_ID, role: "elder", name: "Grandma Account" },
  [TOKENS.familyView]: { _id: FAMILY_VIEW_ID, role: "family", name: "Son" },
  [TOKENS.familyEditor]: { _id: FAMILY_EDITOR_ID, role: "family", name: "Daughter" },
  [TOKENS.unlinked]: { _id: UNLINKED_USER_ID, role: "family", name: "Stranger" },
  [TOKENS.admin]: { _id: ADMIN_USER_ID, role: "admin", name: "Admin" },
  [TOKENS.volunteer]: { _id: VOLUNTEER_USER_ID, role: "volunteer", name: "Volunteer" },
};

async function verifyIdToken(token) {
  if (!(token in USERS_BY_UID)) throw new Error("invalid token");
  return { uid: token };
}

function fakeUserModel() {
  return { findOne: async ({ authUid }) => USERS_BY_UID[authUid] ?? null };
}

// Fake CareLink model: findOne matches on elderId and userId as strings.
// create() appends, so a link made by POST /elders is visible to later calls.
function fakeCareLinkModel(initialLinks) {
  const links = [...initialLinks];
  return {
    findOne: async ({ elderId, userId }) =>
      links.find((l) => String(l.elderId) === String(elderId) && String(l.userId) === String(userId)) ??
      null,
    create: async (doc) => {
      const created = { _id: newFakeId(), ...doc };
      links.push(created);
      return created;
    },
  };
}

// Fake Elder model, shared by the route handlers and by authorize's owner check,
// so both see the same data (e.g. a PUT's update is visible to a later GET).
function fakeElderModel(initialElders) {
  const elders = [...initialElders];
  return {
    findById: async (id) => elders.find((e) => String(e._id) === String(id)) ?? null,
    findByIdAndUpdate: async (id, update) => {
      const idx = elders.findIndex((e) => String(e._id) === String(id));
      if (idx === -1) return null;
      elders[idx] = { ...elders[idx], ...(update.$set ?? {}) };
      return elders[idx];
    },
    create: async (doc) => {
      const created = { _id: newFakeId(), ...doc };
      elders.push(created);
      return created;
    },
  };
}

function buildElderApp({ elders, links }) {
  const ElderModel = fakeElderModel(elders);
  const CareLinkModel = fakeCareLinkModel(links);
  const authenticate = createAuthenticate({ verifyIdToken, UserModel: fakeUserModel() });

  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createElderRouter({
      authenticate,
      ElderModel,
      CareLinkModel,
      authDeps: { CareLink: CareLinkModel, Elder: ElderModel },
    })
  );
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

function getProfile(base, elderId, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`${base}/api/v1/elders/${elderId}/profile`, { headers });
}

function putProfile(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/profile`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function createElder(base, token, body) {
  return fetch(`${base}/api/v1/elders`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

const BASE_ELDER = {
  _id: ELDER_ID,
  userId: OWNER_USER_ID,
  displayName: "Grandma",
  allergies: [],
  preferredLanguage: "te",
};

const BASE_LINKS = [
  { elderId: ELDER_ID, userId: FAMILY_VIEW_ID, status: "active", permissions: ["viewMedicines"] },
  {
    elderId: ELDER_ID,
    userId: FAMILY_EDITOR_ID,
    status: "active",
    permissions: ["viewMedicines", "editProfile"],
  },
];

// ---- POST /elders ----

test("POST /elders without a token -> 401 UNAUTHENTICATED", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const res = await createElder(base, null, { displayName: "New Elder" });
    assert.equal(res.status, 401);
  });
});

test("POST /elders as family -> 201, creates the elder and an active full-permission CareLink", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const res = await createElder(base, TOKENS.familyEditor, {
      displayName: "New Elder",
      relation: "daughter",
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.elder.displayName, "New Elder");
    assert.equal(body.carelink.status, "active");
    assert.equal(body.carelink.relation, "daughter");
    assert.deepEqual(
      [...body.carelink.permissions].sort(),
      ["editProfile", "manageRequests", "manageTasks", "receiveAlerts", "viewMedicines"].sort()
    );
  });
});

test("POST /elders as admin -> 201", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const res = await createElder(base, TOKENS.admin, { displayName: "New Elder" });
    assert.equal(res.status, 201);
  });
});

test("POST /elders as the elder role itself -> 403 FORBIDDEN", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const res = await createElder(base, TOKENS.owner, { displayName: "New Elder" });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, "FORBIDDEN");
  });
});

test("POST /elders as a volunteer -> 403 FORBIDDEN", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const res = await createElder(base, TOKENS.volunteer, { displayName: "New Elder" });
    assert.equal(res.status, 403);
  });
});

test("POST /elders without displayName -> 400 VALIDATION_FAILED", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const res = await createElder(base, TOKENS.familyEditor, {});
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "VALIDATION_FAILED");
  });
});

test("POST /elders then GET its profile with the same token -> 200 (the bootstrap CareLink actually grants access)", async () => {
  const app = buildElderApp({ elders: [], links: [] });
  await withServer(app, async (base) => {
    const created = await createElder(base, TOKENS.familyEditor, { displayName: "New Elder" });
    const newElderId = (await created.json()).elder.id;

    const profileRes = await getProfile(base, newElderId, TOKENS.familyEditor);
    assert.equal(profileRes.status, 200);
    assert.equal((await profileRes.json()).elder.displayName, "New Elder");
  });
});

// ---- GET /elders/:elderId/profile ----

test("GET profile without a token -> 401 UNAUTHENTICATED", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await getProfile(base, ELDER_ID, null);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, "UNAUTHENTICATED");
  });
});

test("GET profile as the elder owner -> 200", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await getProfile(base, ELDER_ID, TOKENS.owner);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.elder.displayName, "Grandma");
  });
});

test("GET profile as linked family with any permission -> 200", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await getProfile(base, ELDER_ID, TOKENS.familyView);
    assert.equal(res.status, 200);
  });
});

test("GET profile as an unlinked user -> 403 FORBIDDEN", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await getProfile(base, ELDER_ID, TOKENS.unlinked);
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, "FORBIDDEN");
  });
});

// ---- PUT /elders/:elderId/profile ----

test("PUT profile as family with editProfile -> 200 and applies the update", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await putProfile(base, ELDER_ID, TOKENS.familyEditor, {
      displayName: "Grandma Lakshmi",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.elder.displayName, "Grandma Lakshmi");
  });
});

test("PUT profile as family lacking editProfile -> 403 FORBIDDEN", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await putProfile(base, ELDER_ID, TOKENS.familyView, { displayName: "Hacked" });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, "FORBIDDEN");
  });
});

test("PUT profile as the elder owner (no editProfile link needed) -> 200", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: [] });
  await withServer(app, async (base) => {
    const res = await putProfile(base, ELDER_ID, TOKENS.owner, { bloodGroup: "O+" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.elder.bloodGroup, "O+");
  });
});

test("PUT profile with an invalid field value -> 400 VALIDATION_FAILED", async () => {
  const app = buildElderApp({ elders: [BASE_ELDER], links: BASE_LINKS });
  await withServer(app, async (base) => {
    const res = await putProfile(base, ELDER_ID, TOKENS.familyEditor, { gender: "robot" });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "VALIDATION_FAILED");
  });
});

test("GET profile for an elder id that doesn't exist, requested by a linked user -> 404 NOT_FOUND", async () => {
  // A CareLink pointing at an id with no matching Elder document: authorize passes
  // (the link is active and holds the permission), then the handler's own lookup 404s.
  const links = [
    {
      elderId: MISSING_ELDER_ID,
      userId: FAMILY_VIEW_ID,
      status: "active",
      permissions: ["viewMedicines"],
    },
  ];
  const app = buildElderApp({ elders: [BASE_ELDER], links });
  await withServer(app, async (base) => {
    const res = await getProfile(base, MISSING_ELDER_ID, TOKENS.familyView);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, "NOT_FOUND");
  });
});
