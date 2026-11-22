// Appointment route tests. Run with: node --test tests/appointment.test.js

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { errorHandler } from "../src/middleware/errorHandler.js";
import { createAppointmentRouter } from "../src/routes/appointment.routes.js";
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

function buildApp({ appointments = [], links = BASE_LINKS, elders = [] } = {}) {
  const AppointmentModel = fakeCrudModel(appointments);
  // A separate fake from authDeps.Elder (used only for the demo elder
  // lookup/create - the real fakeElderModel() below has no .create()).
  const ElderModel = fakeCrudModel(elders);
  const authDeps = { CareLink: fakeCareLinkModel(links), Elder: fakeElderModel() };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    createAppointmentRouter({ authenticate: makeAuthenticate(), AppointmentModel, ElderModel, authDeps })
  );
  app.use(errorHandler);
  return app;
}

function list(base, elderId, token) {
  return fetch(`${base}/api/v1/elders/${elderId}/appointments`, { headers: authHeader(token) });
}

function create(base, elderId, token, body) {
  return fetch(`${base}/api/v1/elders/${elderId}/appointments`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function patch(base, id, token, body) {
  return fetch(`${base}/api/v1/appointments/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
}

function destroy(base, id, token) {
  return fetch(`${base}/api/v1/appointments/${id}`, { method: "DELETE", headers: authHeader(token) });
}

test("GET appointments as linked family -> 200", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.familyView);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).appointments, []);
  });
});

test("GET appointments as an unlinked user -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.unlinked);
    assert.equal(res.status, 403);
  });
});

test("GET appointments -> sorted by scheduledAt ascending and 'past' is derived", async () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  const appointments = [
    { _id: "1", elderId: ELDER_ID, doctor: "Dr. Rao", place: "City Heart Centre", scheduledAt: future, status: "booked" },
    { _id: "2", elderId: ELDER_ID, doctor: "Dr. Sharma", place: "Eye Clinic", scheduledAt: past, status: "completed" },
  ];
  const app = buildApp({ appointments });
  await withServer(app, async (base) => {
    const res = await list(base, ELDER_ID, TOKENS.familyView);
    assert.equal(res.status, 200);
    const body = (await res.json()).appointments;
    assert.equal(body.length, 2);
    assert.equal(body[0].doctor, "Dr. Sharma");
    assert.equal(body[0].past, true);
    assert.equal(body[1].doctor, "Dr. Rao");
    assert.equal(body[1].past, false);
  });
});

test("POST appointment without editProfile -> 403 FORBIDDEN", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyView, {
      doctor: "Dr. Rao",
      place: "City Heart Centre",
      scheduledAt: new Date().toISOString(),
    });
    assert.equal(res.status, 403);
  });
});

test("POST appointment with editProfile -> 201 with the appointment", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, {
      title: "Cardiology follow-up",
      doctor: "Dr. Rao",
      place: "City Heart Centre",
      scheduledAt: "2026-12-03T10:30:00.000Z",
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.appointment.doctor, "Dr. Rao");
    assert.equal(body.appointment.status, "booked");
    assert.equal(body.appointment.cabBooked, false);
  });
});

test("POST appointment missing doctor -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, {
      place: "City Heart Centre",
      scheduledAt: new Date().toISOString(),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "VALIDATION_FAILED");
  });
});

test("POST appointment with an invalid scheduledAt -> 400 VALIDATION_FAILED", async () => {
  const app = buildApp();
  await withServer(app, async (base) => {
    const res = await create(base, ELDER_ID, TOKENS.familyEditor, {
      doctor: "Dr. Rao",
      place: "City Heart Centre",
      scheduledAt: "not-a-date",
    });
    assert.equal(res.status, 400);
  });
});

const APPOINTMENT_ID = "64c000000000000000000002";

test("PATCH appointment as the elder owner -> 200 (e.g. booking a cab)", async () => {
  const appointment = {
    _id: APPOINTMENT_ID,
    elderId: ELDER_ID,
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: new Date(),
    status: "booked",
    cabBooked: false,
  };
  const app = buildApp({ appointments: [appointment], links: [] });
  await withServer(app, async (base) => {
    const res = await patch(base, APPOINTMENT_ID, TOKENS.owner, { cabBooked: true });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).appointment.cabBooked, true);
  });
});

test("PATCH appointment reschedule (new scheduledAt) -> 200", async () => {
  const appointment = {
    _id: APPOINTMENT_ID,
    elderId: ELDER_ID,
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: new Date("2026-12-03T10:30:00.000Z"),
    status: "not-booked-yet",
  };
  const app = buildApp({ appointments: [appointment] });
  await withServer(app, async (base) => {
    const res = await patch(base, APPOINTMENT_ID, TOKENS.familyEditor, {
      scheduledAt: "2026-12-10T09:00:00.000Z",
      status: "booked",
    });
    assert.equal(res.status, 200);
    const body = (await res.json()).appointment;
    assert.equal(body.status, "booked");
    assert.equal(body.scheduledAt, "2026-12-10T09:00:00.000Z");
  });
});

test("PATCH appointment without editProfile -> 403 FORBIDDEN", async () => {
  const appointment = {
    _id: APPOINTMENT_ID,
    elderId: ELDER_ID,
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: new Date(),
  };
  const app = buildApp({ appointments: [appointment] });
  await withServer(app, async (base) => {
    const res = await patch(base, APPOINTMENT_ID, TOKENS.familyView, { cabBooked: true });
    assert.equal(res.status, 403);
  });
});

test("DELETE appointment with editProfile -> 204", async () => {
  const appointment = {
    _id: APPOINTMENT_ID,
    elderId: ELDER_ID,
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: new Date(),
  };
  const app = buildApp({ appointments: [appointment] });
  await withServer(app, async (base) => {
    const res = await destroy(base, APPOINTMENT_ID, TOKENS.familyEditor);
    assert.equal(res.status, 204);
  });
});

test("DELETE appointment without editProfile -> 403 FORBIDDEN", async () => {
  const appointment = {
    _id: APPOINTMENT_ID,
    elderId: ELDER_ID,
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: new Date(),
  };
  const app = buildApp({ appointments: [appointment] });
  await withServer(app, async (base) => {
    const res = await destroy(base, APPOINTMENT_ID, TOKENS.familyView);
    assert.equal(res.status, 403);
  });
});

// ---- /appointments/demo (no auth - demo mode has no real signed-in account) ----

const DEMO_ELDER_ID = "000000000000000000000001";

function demoList(base) {
  return fetch(`${base}/api/v1/appointments/demo`);
}

function demoCreate(base, body) {
  return fetch(`${base}/api/v1/appointments/demo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function demoPatch(base, id, body) {
  return fetch(`${base}/api/v1/appointments/demo/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function demoDestroy(base, id) {
  return fetch(`${base}/api/v1/appointments/demo/${id}`, { method: "DELETE" });
}

test("GET /appointments/demo with no auth header -> 200, seeds the demo elder and its 3 appointments", async () => {
  const app = buildApp({ appointments: [], elders: [] });
  await withServer(app, async (base) => {
    const res = await demoList(base);
    assert.equal(res.status, 200);
    const body = (await res.json()).appointments;
    assert.equal(body.length, 3);
    assert.ok(body.every((a) => a.elderId === DEMO_ELDER_ID));
  });
});

test("GET /appointments/demo twice -> second call does not duplicate the seed", async () => {
  const app = buildApp({ appointments: [], elders: [] });
  await withServer(app, async (base) => {
    await demoList(base);
    const res = await demoList(base);
    assert.equal((await res.json()).appointments.length, 3);
  });
});

test("POST /appointments/demo with no auth header -> 201, persists under the demo elder", async () => {
  const app = buildApp({ appointments: [], elders: [] });
  await withServer(app, async (base) => {
    const res = await demoCreate(base, {
      doctor: "Dr. Rao",
      place: "City Heart Centre",
      scheduledAt: new Date().toISOString(),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()).appointment;
    assert.equal(body.elderId, DEMO_ELDER_ID);
    assert.equal(body.status, "booked");
  });
});

test("PATCH /appointments/demo/:id -> 200, updates it", async () => {
  const appointment = {
    _id: APPOINTMENT_ID,
    elderId: DEMO_ELDER_ID,
    doctor: "Dr. Rao",
    place: "City Heart Centre",
    scheduledAt: new Date(),
    cabBooked: false,
  };
  const app = buildApp({ appointments: [appointment], elders: [{ _id: DEMO_ELDER_ID, displayName: "Lakshmi Devi" }] });
  await withServer(app, async (base) => {
    const res = await demoPatch(base, APPOINTMENT_ID, { cabBooked: true });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).appointment.cabBooked, true);
  });
});

test("PATCH /appointments/demo/:id for an id under a different elder -> 404 NOT_FOUND", async () => {
  const appointment = { _id: APPOINTMENT_ID, elderId: ELDER_ID, doctor: "Dr. Rao", place: "X", scheduledAt: new Date() };
  const app = buildApp({ appointments: [appointment], elders: [] });
  await withServer(app, async (base) => {
    const res = await demoPatch(base, APPOINTMENT_ID, { cabBooked: true });
    assert.equal(res.status, 404);
  });
});

test("DELETE /appointments/demo/:id -> 204", async () => {
  const appointment = { _id: APPOINTMENT_ID, elderId: DEMO_ELDER_ID, doctor: "Dr. Rao", place: "X", scheduledAt: new Date() };
  const app = buildApp({ appointments: [appointment], elders: [{ _id: DEMO_ELDER_ID, displayName: "Lakshmi Devi" }] });
  await withServer(app, async (base) => {
    const res = await demoDestroy(base, APPOINTMENT_ID);
    assert.equal(res.status, 204);
  });
});

test("DELETE /appointments/demo/:id for an id under a different elder -> 404 NOT_FOUND", async () => {
  const appointment = { _id: APPOINTMENT_ID, elderId: ELDER_ID, doctor: "Dr. Rao", place: "X", scheduledAt: new Date() };
  const app = buildApp({ appointments: [appointment], elders: [] });
  await withServer(app, async (base) => {
    const res = await demoDestroy(base, APPOINTMENT_ID);
    assert.equal(res.status, 404);
  });
});
