// Shared test fixtures for the elder sub-resource routes (conditions, doctors,
// emergency contacts, insurance). Not a test file itself - imported by them.
// No MongoDB or Firebase is needed: everything here is an in-memory fake.

import { createAuthenticate } from "../../src/middleware/authenticate.js";

export const ELDER_ID = "64b000000000000000000001";
export const OWNER_USER_ID = "64b000000000000000000011";
export const FAMILY_VIEW_ID = "64b000000000000000000012";
export const FAMILY_EDITOR_ID = "64b000000000000000000013";
export const UNLINKED_USER_ID = "64b000000000000000000014";

export const TOKENS = {
  owner: "tok-owner",
  familyView: "tok-family-view",
  familyEditor: "tok-family-editor",
  unlinked: "tok-unlinked",
};

const USERS_BY_UID = {
  [TOKENS.owner]: { _id: OWNER_USER_ID, role: "elder", name: "Grandma Account" },
  [TOKENS.familyView]: { _id: FAMILY_VIEW_ID, role: "family", name: "Son" },
  [TOKENS.familyEditor]: { _id: FAMILY_EDITOR_ID, role: "family", name: "Daughter" },
  [TOKENS.unlinked]: { _id: UNLINKED_USER_ID, role: "family", name: "Stranger" },
};

async function verifyIdToken(token) {
  if (!(token in USERS_BY_UID)) throw new Error("invalid token");
  return { uid: token };
}

export function makeAuthenticate() {
  return createAuthenticate({
    verifyIdToken,
    UserModel: { findOne: async ({ authUid }) => USERS_BY_UID[authUid] ?? null },
  });
}

// One elder, owned by OWNER_USER_ID. FAMILY_VIEW_ID has a view-only link,
// FAMILY_EDITOR_ID has editProfile, UNLINKED_USER_ID has no link at all.
export const BASE_ELDER = { _id: ELDER_ID, userId: OWNER_USER_ID };

export const BASE_LINKS = [
  { elderId: ELDER_ID, userId: FAMILY_VIEW_ID, status: "active", permissions: ["viewMedicines"] },
  {
    elderId: ELDER_ID,
    userId: FAMILY_EDITOR_ID,
    status: "active",
    permissions: ["viewMedicines", "editProfile"],
  },
];

export function fakeElderModel(elders = [BASE_ELDER]) {
  return { findById: async (id) => elders.find((e) => String(e._id) === String(id)) ?? null };
}

export function fakeCareLinkModel(links = BASE_LINKS) {
  return {
    findOne: async ({ elderId, userId }) =>
      links.find((l) => String(l.elderId) === String(elderId) && String(l.userId) === String(userId)) ??
      null,
  };
}

function applyFilter(docs, filter) {
  return docs.filter((doc) =>
    Object.entries(filter).every(([key, value]) => String(doc[key]) === String(value))
  );
}

// A query-like, thenable result so routes that do `.sort(...)` on a find()
// result work the same as a real Mongoose Query; routes that just `await`
// find() directly also work, since await accepts any thenable.
function makeQueryResult(initialDocs) {
  let docs = initialDocs;
  const query = {
    sort(spec) {
      const [[key, dir]] = Object.entries(spec);
      docs = [...docs].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        return (a[key] > b[key] ? 1 : -1) * dir;
      });
      return query;
    },
    then(resolve, reject) {
      Promise.resolve(docs).then(resolve, reject);
    },
  };
  return query;
}

// A minimal, generic in-memory Mongoose-model fake shared by every
// sub-resource (Condition, Doctor, EmergencyContact, InsurancePolicy): their
// routes all call find/findById/create/findByIdAndUpdate/findByIdAndDelete
// with the same signatures, just different field shapes.
export function fakeCrudModel(initialDocs = []) {
  const docs = [...initialDocs];
  let nextId = 1000;

  return {
    find: (filter = {}) => makeQueryResult(applyFilter(docs, filter)),
    findById: async (id) => docs.find((d) => String(d._id) === String(id)) ?? null,
    create: async (doc) => {
      const created = { _id: String(nextId++), ...doc };
      docs.push(created);
      return created;
    },
    findByIdAndUpdate: async (id, update) => {
      const idx = docs.findIndex((d) => String(d._id) === String(id));
      if (idx === -1) return null;
      docs[idx] = { ...docs[idx], ...(update.$set ?? {}) };
      return docs[idx];
    },
    findByIdAndDelete: async (id) => {
      const idx = docs.findIndex((d) => String(d._id) === String(id));
      if (idx === -1) return null;
      const [removed] = docs.splice(idx, 1);
      return removed ?? null;
    },
    // Filter-based variants (e.g. { _id, elderId } together) - used by
    // routes that scope a write by more than just the id.
    findOneAndUpdate: async (filter, update) => {
      const idx = docs.findIndex((d) => applyFilter([d], filter).length > 0);
      if (idx === -1) return null;
      docs[idx] = { ...docs[idx], ...(update.$set ?? {}) };
      return docs[idx];
    },
    findOneAndDelete: async (filter) => {
      const idx = docs.findIndex((d) => applyFilter([d], filter).length > 0);
      if (idx === -1) return null;
      const [removed] = docs.splice(idx, 1);
      return removed ?? null;
    },
  };
}

export async function withServer(app, fn) {
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

export function authHeader(token) {
  return token ? { authorization: `Bearer ${token}` } : {};
}
