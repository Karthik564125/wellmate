// Every route in the app hangs off this router, mounted at /api/v1 in
// server.js. Add new *.routes.js files here as they're built
// (auth, elder, assistant, request, task, ...).

import { Router } from "express";

import conditionRoutes from "./condition.routes.js";
import doctorRoutes from "./doctor.routes.js";
import elderRoutes from "./elder.routes.js";
import emergencyContactRoutes from "./emergencyContact.routes.js";
import healthRoutes from "./health.routes.js";
import insuranceRoutes from "./insurance.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(elderRoutes);
router.use(conditionRoutes);
router.use(doctorRoutes);
router.use(emergencyContactRoutes);
router.use(insuranceRoutes);

export default router;
