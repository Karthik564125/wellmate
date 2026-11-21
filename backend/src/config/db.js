// MongoDB connection via Mongoose. Fail fast on connect error, consistent
// with env.js: a backend that can't reach its database shouldn't silently
// stay up and fail every request later.

import mongoose from "mongoose";

import { env } from "./env.js";

export async function connectDB() {
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}
