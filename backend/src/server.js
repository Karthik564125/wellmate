import cors from "cors";
import express from "express";
import helmet from "helmet";

import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { assistantRateLimiter } from "./middleware/rateLimiter.js";
import apiRouter from "./routes/index.js";
import authRouter from "./routes/auth.routes.js";
import meRouter from "./routes/me.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.send("Wellmate Backend is running!");
});

app.use("/api/v1/assistant", assistantRateLimiter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", meRouter);
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Wellmate server running on port ${env.PORT}`);
  });
}

start();
