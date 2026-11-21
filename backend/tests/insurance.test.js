// Insurance route tests. Run with: node --test tests/insurance.test.js
// Focus: policyNumber must be masked in the list response, but full on create/update.

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { maskPolicyNumber } from "../src/models/InsurancePolicy.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { createInsuranceRouter } from "../src/routes/insurance.routes.js";
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

function buildApp({ policies = [], links = BASE_LINKS } = {}) {
  const InsuranceModel = fakeCrudModel(policies);
  const authDeps = { CareLink: fakeCareLinkModel(links), Elder: fakeElderModel() };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createInsuranceRouter({ authenticate: makeAuthenticate(), InsuranceModel, authDeps })
  );
  app.use(errorHandler);
  return app;
}

function list(base, elderId, token) {
  return fetch(`${base}/api/v1/elders/${elderId}/insurance`, { headers: authHeader(token) });
}

function create(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/insurance`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function patch(base, id, token, body) {
  return fetch(`${base}/api/v1/insurance/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

test("maskPolicyNumber keeps only the last 4 characters", () => {
  assert.equal(maskPolicyNumber("ABC123456789"), "••••••••6789");
  assert.equal(maskPolicyNumber("1234"), "••••");
  assert.equal(maskPolicyNumber(""), "");
});

test("GET insurance list masks policyNumber", async () => {
  const policy = {
    _id: "i1",
    elderId: ELDER_ID,
    provider: "Star Health",
    policyNumber: "SH-9988776655",
  };
  const app = buildApp({ policies: [policy] });
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.familyView);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.insurance.length, 1);
    assert.equal(body.insurance[0].policyNumber, maskPolicyNumber(policy.policyNumber));
    assert.notEqual(body.insurance[0].policyNumber, policy.policyNumber);
  });
});

test("GET insurance list as an unlinked user -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.unlinked);
    assert.equal(res.status, 403);
  });
});

test("POST insurance without editProfile -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyView, {
      provider: "Star Health",
      policyNumber: "SH-123",
    });
    assert.equal(res.status, 403);
  });
});

test("POST insurance with editProfile -> 201 with the FULL policyNumber (not masked)", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, {
      provider: "Star Health",
      policyNumber: "SH-9988776655",
      sumInsured: 500000,
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.insurance.policyNumber, "SH-9988776655");
    assert.equal(body.insurance.sumInsured, 500000);
  });
});

test("POST insurance without a policyNumber -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, { provider: "Star Health" });
    assert.equal(res.status, 400);
  });
});

const POLICY_ID = "64c000000000000000000004";

test("PATCH insurance as the elder owner -> 200 with the full (unmasked) policyNumber", async () => {
  const policy = {
    _id: POLICY_ID,
    elderId: ELDER_ID,
    provider: "Star Health",
    policyNumber: "SH-OLD",
  };
  const app = buildApp({ policies: [policy], links: [] });
  await withServer(app, async (base) => {
    const res = await patch(base, POLICY_ID, TOKENS.owner, { policyNumber: "SH-NEW-123456" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).insurance.policyNumber, "SH-NEW-123456");
  });
});
