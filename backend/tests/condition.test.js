// Condition route tests. Run with: node --test tests/condition.test.js

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { errorHandler } from "../src/middleware/errorHandler.js";
import { createConditionRouter } from "../src/routes/condition.routes.js";
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

function buildApp({ conditions = [], links = BASE_LINKS } = {}) {
  const ConditionModel = fakeCrudModel(conditions);
  const authDeps = { CareLink: fakeCareLinkModel(links), Elder: fakeElderModel() };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createConditionRouter({ authenticate: makeAuthenticate(), ConditionModel, authDeps })
  );
  app.use(errorHandler);
  return app;
}

function list(base, elderId, token) {
  return fetch(`${base}/api/v1/elders/${elderId}/conditions`, { headers: authHeader(token) });
}

function create(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/conditions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function patch(base, id, token, body) {
  return fetch(`${base}/api/v1/conditions/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function destroy(base, id, token) {
  return fetch(`${base}/api/v1/conditions/${id}`, { method: "DELETE", headers: authHeader(token) });
}

test("GET conditions as an unlinked user -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.unlinked);
    assert.equal(res.status, 403);
  });
});

test("POST condition without editProfile -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyView, { name: "Diabetes" });
    assert.equal(res.status, 403);
  });
});

test("POST condition with editProfile -> 201, then GET lists it", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const created = await create(base, ELDER_ID, TOKENS.familyEditor, {
      name: "Diabetes",
      sinceYear: 2018,
      status: "managed",
    });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.condition.name, "Diabetes");
    assert.equal(createdBody.condition.sinceYear, 2018);

    const listed = await list(base, ELDER_ID, TOKENS.owner);
    assert.equal(listed.status, 200);
    const listedBody = await listed.json();
    assert.equal(listedBody.conditions.length, 1);
    assert.equal(listedBody.conditions[0].status, "managed");
  });
});

const CONDITION_ID = "64c000000000000000000001";

test("PATCH condition as the elder owner (no CareLink needed) -> 200", async () => {
  const condition = { _id: CONDITION_ID, elderId: ELDER_ID, name: "Diabetes", status: "active" };
  const app = buildApp({ conditions: [condition], links: [] });
  await withServer(app, async (base) => {
    const res = await patch(base, CONDITION_ID, TOKENS.owner, { status: "managed" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.condition.status, "managed");
  });
});

test("PATCH condition as an unlinked user -> 403 FORBIDDEN", async () => {
  const condition = { _id: CONDITION_ID, elderId: ELDER_ID, name: "Diabetes" };
  const app = buildApp({ conditions: [condition] });
  await withServer(app, async (base) => {
    const res = await patch(base, CONDITION_ID, TOKENS.unlinked, { status: "resolved" });
    assert.equal(res.status, 403);
  });
});

test("DELETE condition with editProfile -> 204", async () => {
  const condition = { _id: CONDITION_ID, elderId: ELDER_ID, name: "Diabetes" };
  const app = buildApp({ conditions: [condition] });
  await withServer(app, async (base) => {
    const res = await destroy(base, CONDITION_ID, TOKENS.familyEditor);
    assert.equal(res.status, 204);
  });
});

test("POST condition with an empty name -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, { name: "" });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "VALIDATION_FAILED");
  });
});
