import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import assessmentRoutes from "./routes/assessment.js";
import mealRoutes from "./routes/meals.js";
import fitnessRoutes from "./routes/fitness.js";
import coachRoutes from "./routes/coach.js";
import paymentRoutes from "./routes/payments.js";
import feedbackRoutes from "./routes/feedback.js";
import workoutLogRoutes from "./routes/workoutLogs.js";
import overloadRoutes from "./routes/overload.js";
import analyticsRoutes from "./routes/analytics.js";
import habitsRoutes from "./routes/habits.js";
import achievementsRoutes from "./routes/achievements.js";
import notificationsRoutes from "./routes/notifications.js";
import profileRoutes from "./routes/profile.js";
import adminRoutes from "./routes/admin.js";
import { pool } from "./config/db.js";

dotenv.config();

const app = express();

// Body limit raised because body-scan / food-image endpoints send base64 images.
app.use(express.json({ limit: "60mb" })); // raised for short workout video uploads

// CORS — matches the FastAPI CORSMiddleware config.
const origins = (process.env.CORS_ORIGINS || "*").split(",");
app.use(
  cors({
    origin: origins.includes("*") ? true : origins,
    credentials: true,
    methods: ["*"],
    allowedHeaders: ["*"],
  })
);

// All routes are mounted under /api (FastAPI used APIRouter(prefix="/api")).
const api = express.Router();
api.use(authRoutes);
api.use(assessmentRoutes);
api.use(mealRoutes);
api.use(fitnessRoutes);
api.use(coachRoutes);
api.use(paymentRoutes);
api.use(feedbackRoutes);
api.use(workoutLogRoutes);
api.use(overloadRoutes);
api.use(analyticsRoutes);
api.use(habitsRoutes);
api.use(achievementsRoutes);
api.use(notificationsRoutes);
api.use(profileRoutes);
api.use(adminRoutes);
app.use("/api", api);

// Central error handler — converts thrown errors (incl. LLM 503) to JSON.
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error("[error]", err.message);
  res.status(status).json({ detail: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`✓ BitFits API running on http://localhost:${PORT}`);
});

// Graceful shutdown (port of @app.on_event("shutdown")).
process.on("SIGINT", async () => {
  await pool.end();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await pool.end();
  server.close(() => process.exit(0));
});
