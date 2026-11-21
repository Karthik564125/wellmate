// Emergency contact route tests. Run with: node --test tests/emergencyContact.test.js

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { errorHandler } from "../src/middleware/errorHandler.js";
import { createEmergencyContactRouter } from "../src/routes/emergencyContact.routes.js";
import {
  BASE_LINKS,
  ELDER_ID,
  TOKENS,
  authHeader,
  fakeCareLinkModel,
  fakeCrudModel,
  fakeElderModel,
  makeAuthenticate,
  withServer,
} from "./helpers/subresourceTestKit.js";

function buildApp({ contacts = [], links = BASE_LINKS } = {}) {
  const EmergencyContactModel = fakeCrudModel(contacts);
  const authDeps = { CareLink: fakeCareLinkModel(links), Elder: fakeElderModel() };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createEmergencyContactRouter({
      authenticate: makeAuthenticate(),
      EmergencyContactModel,
      authDeps,
    })
  );
  app.use(errorHandler);
  return app;
}

function list(base, elderId, token) {
  return fetch(`${base}/api/v1/elders/${elderId}/emergency-contacts`, { headers: authHeader(token) });
}

function create(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/emergency-contacts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function patch(base, id, token, body) {
  return fetch(`${base}/api/v1/emergency-contacts/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

test("POST contact without priority -> auto-assigned after existing contacts", async () => {
  const existing = { _id: "e1", elderId: ELDER_ID, name: "Son", phone: "1", priority: 1 };
  const app = buildApp({ contacts: [existing] });
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, {
      name: "Daughter",
      phone: "2",
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.emergencyContact.priority, 2);
  });
});

test("POST contact without a phone -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, { name: "Son" });
    assert.equal(res.status, 400);
  });
});

test("GET contacts returns them ordered by priority ascending", async () => {
  const contacts = [
    { _id: "e2", elderId: ELDER_ID, name: "Daughter", phone: "2", priority: 2 },
    { _id: "e1", elderId: ELDER_ID, name: "Son", phone: "1", priority: 1 },
  ];
  const app = buildApp({ contacts });
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.owner);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(
      body.emergencyContacts.map((c) => c.name),
      ["Son", "Daughter"]
    );
  });
});

test("GET contacts as an unlinked user -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.unlinked);
    assert.equal(res.status, 403);
  });
});

test("POST contact without editProfile -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyView, { name: "Son", phone: "1" });
    assert.equal(res.status, 403);
  });
});

const CONTACT_ID = "64c000000000000000000003";

test("PATCH contact as the elder owner -> 200", async () => {
  const contact = { _id: CONTACT_ID, elderId: ELDER_ID, name: "Son", phone: "1", priority: 1 };
  const app = buildApp({ contacts: [contact], links: [] });
  await withServer(app, async (base) => {
    const res = await patch(base, CONTACT_ID, TOKENS.owner, { phone: "999" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).emergencyContact.phone, "999");
  });
});
