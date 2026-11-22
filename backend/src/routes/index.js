// Every route in the app hangs off this router, mounted at /api/v1 in
// server.js. Add new *.routes.js files here as they're built
// (auth, elder, assistant, request, task, ...).

import { Router } from "express";

import appointmentRoutes from "./appointment.routes.js";
import assistantRoutes from "./assistant.routes.js";
import careLinkRoutes from "./careLink.routes.js";
import careRequestRoutes from "./careRequest.routes.js";
import caretakerRoutes from "./caretaker.routes.js";
import conditionRoutes from "./condition.routes.js";
import doctorRoutes from "./doctor.routes.js";
import elderRoutes from "./elder.routes.js";
import emergencyContactRoutes from "./emergencyContact.routes.js";
import healthRoutes from "./health.routes.js";
import insuranceRoutes from "./insurance.routes.js";
import medicineRoutes from "./medicine.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(elderRoutes);
router.use(careLinkRoutes);
router.use(careRequestRoutes);
router.use(conditionRoutes);
router.use(doctorRoutes);
router.use(appointmentRoutes);
router.use(caretakerRoutes);
router.use(emergencyContactRoutes);
router.use(insuranceRoutes);
router.use(medicineRoutes);
router.use(assistantRoutes);

export default router;
