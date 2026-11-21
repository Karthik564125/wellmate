// CareLink invite/accept/family/revoke route tests. Run with: node --test tests/careLink.test.js
// No MongoDB or Firebase is needed: fake Firebase token verification, fake User,
// fake CareLink and fake Elder models are all injected.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";

import { createAuthenticate } from "../src/middleware/authenticate.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { createCareLinkRouter } from "../src/routes/careLink.routes.js";

// canAccessElder rejects anything that isn't ObjectId-shaped before looking it
// up, so every fake id here needs to actually look like one.
function newId() {
  return new mongoose.Types.ObjectId().toString();
}

const ELDER_ID = newId();
const OWNER_USER_ID = newId();

const TOKENS = { owner: "tok-owner", newAccount: "tok-new-account" };

// "tok-new-account" deliberately has no matching User yet - that's the whole
// point of the invite-creates-the-account tests below.
const USERS_BY_UID = {
  [TOKENS.owner]: { _id: OWNER_USER_ID, role: "elder", name: "Grandma Account" },
};

async function verifyIdToken(token) {
  if (!(token in USERS_BY_UID) && token !== TOKENS.newAccount) throw new Error("invalid token");
  return { uid: token };
}

function fakeUserModel() {
  const users = { ...USERS_BY_UID };
  return {
    findOne: async ({ authUid }) => users[authUid] ?? null,
    create: async (doc) => {
      const created = { _id: newId(), ...doc };
      users[doc.authUid] = created;
      return created;
    },
  };
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$gt" in value) return doc[key] > value.$gt;
    if (value && typeof value === "object" && "$in" in value) return value.$in.includes(doc[key]);
    if (value === undefined) return true;
    return String(doc[key]) === String(value);
  });
}

// CareLink fake: plain objects with an attached no-op save() (mutations are
// already visible via the shared array reference), findOne().select() is a
// no-op chain since every fake doc already carries every field.
function fakeCareLinkModel(initialLinks = []) {
  const links = [...initialLinks];

  function withSave(doc) {
    if (!doc) return doc;
    doc.save = async () => doc;
    return doc;
  }

  return {
    findOne: (filter) => {
      const found = withSave(links.find((l) => matchesFilter(l, filter)) ?? null);
      return { select: () => found, then: (res, rej) => Promise.resolve(found).then(res, rej) };
    },
    findById: async (id) => withSave(links.find((l) => String(l._id) === String(id)) ?? null),
    find: (filter = {}) => {
      const results = links.filter((l) => matchesFilter(l, filter));
      return {
        sort: () => ({ lean: async () => results }),
        lean: async () => results,
        then: (res, rej) => Promise.resolve(results).then(res, rej),
      };
    },
    create: async (doc) => {
      const created = withSave({ _id: newId(), status: "pending", permissions: [], ...doc });
      links.push(created);
      return created;
    },
  };
}

function fakeElderModel(elders) {
  return { findById: async (id) => elders.find((e) => String(e._id) === String(id)) ?? null };
}

const BASE_ELDER = { _id: ELDER_ID, userId: OWNER_USER_ID };

function buildApp({ elders = [BASE_ELDER], links = [] } = {}) {
  const UserModel = fakeUserModel();
  const CareLinkModel = fakeCareLinkModel(links);
  const ElderModel = fakeElderModel(elders);
  const authenticate = createAuthenticate({ verifyIdToken, UserModel });

  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createCareLinkRouter({
      authenticate,
      CareLinkModel,
      ElderModel,
      UserModel,
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

function authHeader(token) {
  return token ? { authorization: `Bearer ${token}` } : {};
}

function invite(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/care-links/invite`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function accept(base, token, body) {
  return fetch(`${base}/api/v1/care-links/accept`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

// ---- invite ----

test("invite with inviteRole: volunteer -> 201, code and inviteRole returned", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await invite(base, ELDER_ID, TOKENS.owner, {
      relation: "community volunteer",
      inviteRole: "volunteer",
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.invite.inviteRole, "volunteer");
    assert.ok(body.invite.code);
  });
});

// ---- accept: the new invite-creates-the-account path ----

test("accept with inviteRole and no prior account -> creates the User with that role", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const inviteRes = await invite(base, ELDER_ID, TOKENS.owner, { inviteRole: "volunteer" });
    const { code } = (await inviteRes.json()).invite;

    const acceptRes = await accept(base, TOKENS.newAccount, { code, name: "Sandeep Varma" });
    assert.equal(acceptRes.status, 200);
    const body = await acceptRes.json();
    assert.equal(body.user.role, "volunteer");
    assert.equal(body.user.name, "Sandeep Varma");
    assert.equal(body.carelink.status, "active");
  });
});

test("accept with inviteRole but no name -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const inviteRes = await invite(base, ELDER_ID, TOKENS.owner, { inviteRole: "caretaker" });
    const { code } = (await inviteRes.json()).invite;

    const acceptRes = await accept(base, TOKENS.newAccount, { code });
    assert.equal(acceptRes.status, 400);
    assert.equal((await acceptRes.json()).error.code, "VALIDATION_FAILED");
  });
});

test("accept with no prior account and no inviteRole (family-to-family invite) -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    // No inviteRole: a plain family-to-family invite.
    const inviteRes = await invite(base, ELDER_ID, TOKENS.owner, { relation: "daughter" });
    const { code } = (await inviteRes.json()).invite;

    const acceptRes = await accept(base, TOKENS.newAccount, { code, name: "Anjali" });
    assert.equal(acceptRes.status, 403);
    assert.equal((await acceptRes.json()).error.code, "FORBIDDEN");
  });
});

test("accept as an existing account -> 200, unchanged from before (no account creation involved)", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const inviteRes = await invite(base, ELDER_ID, TOKENS.owner, { relation: "daughter" });
    const { code } = (await inviteRes.json()).invite;

    const acceptRes = await accept(base, TOKENS.owner, { code });
    assert.equal(acceptRes.status, 200);
    const body = await acceptRes.json();
    assert.equal(body.carelink.status, "active");
    assert.equal(body.user.role, "elder");
  });
});

test("accept with an unknown code -> 404 NOT_FOUND", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await accept(base, TOKENS.owner, { code: "BADCODE1" });
    assert.equal(res.status, 404);
  });
});

// ---- GET family / PATCH / DELETE (revoke) ----

test("full flow: invite, accept, GET family lists the member, DELETE revokes", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const inviteRes = await invite(base, ELDER_ID, TOKENS.owner, { inviteRole: "volunteer" });
    const { code } = (await inviteRes.json()).invite;
    const acceptRes = await accept(base, TOKENS.newAccount, { code, name: "Sandeep" });
    const linkId = (await acceptRes.json()).carelink.id;

    const familyRes = await fetch(`${base}/api/v1/elders/${ELDER_ID}/family`, {
      headers: authHeader(TOKENS.owner),
    });
    assert.equal(familyRes.status, 200);
    const members = (await familyRes.json()).members;
    assert.equal(members.length, 1);
    assert.equal(members[0].status, "active");

    const deleteRes = await fetch(`${base}/api/v1/care-links/${linkId}`, {
      method: "DELETE",
      headers: authHeader(TOKENS.owner),
    });
    assert.equal(deleteRes.status, 200);
    assert.equal((await deleteRes.json()).carelink.status, "revoked");
  });
});
