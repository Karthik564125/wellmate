// GET/POST /api/v1/elders/:elderId/emergency-contacts
// PATCH/DELETE /api/v1/emergency-contacts/:id

import { Router } from "express";
import { z } from "zod";

import { authenticate as defaultAuthenticate } from "../middleware/authenticate.js";
import { authorize, authorizeLinked, authorizeSubresource } from "../middleware/authorize.js";
import EmergencyContact, { toPublicEmergencyContact } from "../models/EmergencyContact.js";
import { ApiError } from "../utils/ApiError.js";

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  relation: z.string().optional(),
  phone: z.string().trim().min(1, "phone is required"),
  email: z.string().email().optional(),
  // Optional: if omitted, the contact is appended after the current lowest priority.
  priority: z.coerce.number().int().min(1).optional(),
});

const updateSchema = createSchema.partial();

function parseOr400(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw ApiError.validationFailed("Invalid emergency contact data", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

// deps is optional; tests pass a fake authenticate, EmergencyContactModel and authDeps.
export function createEmergencyContactRouter(deps = {}) {
  const authenticate = deps.authenticate ?? defaultAuthenticate;
  const ContactModel = deps.EmergencyContactModel ?? EmergencyContact;
  const authDeps = deps.authDeps ?? {};

  const router = Router();

  router.get(
    "/elders/:elderId/emergency-contacts",
    authenticate,
    authorizeLinked(authDeps),
    async (req, res) => {
      // Priority 1 = first to call, so ascending order is call order.
      const contacts = await ContactModel.find({ elderId: req.params.elderId }).sort({
        priority: 1,
      });
      res.json({ emergencyContacts: contacts.map(toPublicEmergencyContact) });
    }
  );

  router.post(
    "/elders/:elderId/emergency-contacts",
    authenticate,
    authorize("editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(createSchema, req.body);

      let priority = data.priority;
      if (priority === undefined) {
        const existing = await ContactModel.find({ elderId: req.params.elderId });
        const maxPriority = existing.reduce((max, c) => Math.max(max, c.priority ?? 0), 0);
        priority = maxPriority + 1;
      }

      const contact = await ContactModel.create({
        elderId: req.params.elderId,
        ...data,
        priority,
      });
      res.status(201).json({ emergencyContact: toPublicEmergencyContact(contact) });
    }
  );

  router.patch(
    "/emergency-contacts/:id",
    authenticate,
    authorizeSubresource(ContactModel, "editProfile", authDeps),
    async (req, res) => {
      const data = parseOr400(updateSchema, req.body);
      const contact = await ContactModel.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
      );
      res.json({ emergencyContact: toPublicEmergencyContact(contact) });
    }
  );

  router.delete(
    "/emergency-contacts/:id",
    authenticate,
    authorizeSubresource(ContactModel, "editProfile", authDeps),
    async (req, res) => {
      await ContactModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    }
  );

  return router;
}

export default createEmergencyContactRouter();
