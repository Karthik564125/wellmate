// Shared in-memory fakes for the voice-pipeline tests (conversation.service,
// assistant.routes). Not a test file itself - imported by them.

import mongoose from "mongoose";

export function newId() {
  return new mongoose.Types.ObjectId().toString();
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$in" in value) return value.$in.includes(doc[key]);
    if (value && typeof value === "object" && ("$gte" in value || "$lt" in value)) {
      const v = doc[key] instanceof Date ? doc[key].getTime() : doc[key];
      if ("$gte" in value && v < value.$gte.getTime()) return false;
      if ("$lt" in value && v >= value.$lt.getTime()) return false;
      return true;
    }
    if (value === undefined) return true;
    return String(doc[key]) === String(value);
  });
}

function withSave(doc) {
  if (!doc) return doc;
  doc.save = async () => doc;
  return doc;
}

// A query-like, thenable, sortable result - mirrors a real Mongoose Query
// closely enough for every find() call in this codebase to work unchanged.
function makeQueryResult(initialDocs) {
  let list = initialDocs;
  const api = {
    sort(spec) {
      const [[key, dir]] = Object.entries(spec);
      list = [...list].sort((a, b) => {
        const av = a[key] instanceof Date ? a[key].getTime() : a[key];
        const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * dir;
      });
      return api;
    },
    lean: () => api,
    then: (resolve, reject) => Promise.resolve(list.map(withSave)).then(resolve, reject),
  };
  return api;
}

// A query-like, thenable single-document result - supports .lean() (a no-op
// here, since these fakes are already plain-enough objects) so findOne()
// works the same whether or not a caller chains it, like real Mongoose.
function makeSingleResult(doc) {
  const api = {
    lean: () => api,
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
  };
  return api;
}

// Generic in-memory fake Mongoose model: Conversation/CareRequest/Alert/
// Medicine/DoseLog all use find/findById/findOne/create with these same
// signatures, just different field shapes.
export function fakeModel(initialDocs = [], defaults = {}) {
  const docs = [...initialDocs].map(withSave);
  return {
    docs,
    find: (filter = {}) => makeQueryResult(docs.filter((d) => matchesFilter(d, filter))),
    findById: async (id) => withSave(docs.find((d) => String(d._id) === String(id)) ?? null),
    findOne: (filter = {}) => makeSingleResult(withSave(docs.find((d) => matchesFilter(d, filter)) ?? null)),
    create: async (doc) => {
      const created = withSave({ _id: newId(), createdAt: new Date(), ...defaults, ...doc });
      docs.push(created);
      return created;
    },
  };
}

export function fakeNotifier() {
  const calls = { onRequestCreated: [], onAlertCreated: [] };
  return {
    calls,
    onRequestCreated: async (r) => {
      calls.onRequestCreated.push(r);
    },
    onAlertCreated: async (a) => {
      calls.onAlertCreated.push(a);
    },
  };
}

// Returns an extractIntentFn fake that serves `results` in order, one per call.
export function sequenceIntentFn(results) {
  let i = 0;
  return async () => {
    const r = results[Math.min(i, results.length - 1)];
    i += 1;
    if (r instanceof Error) throw r;
    return r;
  };
}
