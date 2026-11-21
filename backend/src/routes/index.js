// Every route in the app hangs off this router, mounted at /api/v1 in
// server.js. Add new *.routes.js files here as they're built
// (auth, elder, assistant, request, task, ...).

import { Router } from "express";

import healthRoutes from "./health.routes.js";

const router = Router();

router.use(healthRoutes);

export default router;
