// Doctor route tests. Run with: node --test tests/doctor.test.js

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { errorHandler } from "../src/middleware/errorHandler.js";
import { createDoctorRouter } from "../src/routes/doctor.routes.js";
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

function buildApp({ doctors = [], links = BASE_LINKS } = {}) {
  const DoctorModel = fakeCrudModel(doctors);
  const authDeps = { CareLink: fakeCareLinkModel(links), Elder: fakeElderModel() };

  const app = express();
  app.use(express.json());
  app.use("/api/v1", createDoctorRouter({ authenticate: makeAuthenticate(), DoctorModel, authDeps }));
  app.use(errorHandler);
  return app;
}

function list(base, elderId, token) {
  return fetch(`${base}/api/v1/elders/${elderId}/doctors`, { headers: authHeader(token) });
}

function create(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/doctors`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function patch(base, id, token, body) {
  return fetch(`${base}/api/v1/doctors/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function destroy(base, id, token) {
  return fetch(`${base}/api/v1/doctors/${id}`, { method: "DELETE", headers: authHeader(token) });
}

test("GET doctors as linked family -> 200", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.familyView);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).doctors, []);
  });
});

test("GET doctors as an unlinked user -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.unlinked);
    assert.equal(res.status, 403);
  });
});

test("POST doctor without editProfile -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyView, { name: "Dr. Rao" });
    assert.equal(res.status, 403);
  });
});

test("POST doctor with editProfile -> 201 with the doctor", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, {
      name: "Dr. Rao",
      specialty: "Cardiology",
      phone: "9999999999",
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.doctor.name, "Dr. Rao");
    assert.equal(body.doctor.specialty, "Cardiology");
  });
});

const DOCTOR_ID = "64c000000000000000000002";

test("PATCH doctor as the elder owner -> 200", async () => {
  const doctor = { _id: DOCTOR_ID, elderId: ELDER_ID, name: "Dr. Rao", phone: "111" };
  const app = buildApp({ doctors: [doctor], links: [] });
  await withServer(app, async (base) => {
    const res = await patch(base, DOCTOR_ID, TOKENS.owner, { phone: "222" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).doctor.phone, "222");
  });
});

test("DELETE doctor with editProfile -> 204", async () => {
  const doctor = { _id: DOCTOR_ID, elderId: ELDER_ID, name: "Dr. Rao" };
  const app = buildApp({ doctors: [doctor] });
  await withServer(app, async (base) => {
    const res = await destroy(base, DOCTOR_ID, TOKENS.familyEditor);
    assert.equal(res.status, 204);
  });
});

test("POST doctor with an empty name -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, { name: "" });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "VALIDATION_FAILED");
  });
});
