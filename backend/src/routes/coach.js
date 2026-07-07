import { Router } from "express";
import { pool, query } from "../config/db.js";
import { getCurrentUser } from "../middleware/auth.js";
import { newId, nowIso, today, parseJsonField } from "../utils/helpers.js";
import { validate } from "../utils/validate.js";
import { llmJson, llmChat } from "../services/llm.js";

const router = Router();

// ---------- AI Coach ----------
// POST /api/coach/chat
router.post("/coach/chat", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      message: { type: "string", required: true },
      session_id: { type: "string", default: null },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const p = req.user.profile || {};
    const system =
      `You are BitFits AI, the user's personal fitness & nutrition coach. The user's name is ${req.user.name || "Athlete"}. ` +
      `Profile: goal=${p.goal}, weight=${p.weight_kg}kg, height=${p.height_cm}cm, ` +
      `target_cal=${p.target_cal}, protein_goal=${p.protein_goal_g}g, experience=${p.experience}. ` +
      "Be concise, motivational, evidence-based. Keep replies under 180 words. Use short paragraphs and bullet lists when useful.";
    const sessionId = b.session_id || `coach-${req.user.id}`;
    const reply = await llmChat(system, b.message);
    await pool.execute(
      `INSERT INTO coach_messages (id, user_id, session_id, role_user, role_assistant, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId(), req.user.id, sessionId, b.message, reply, nowIso()]
    );
    return res.json({ reply, session_id: sessionId });
  } catch (err) {
    next(err);
  }
});

// GET /api/coach/history
router.get("/coach/history", getCurrentUser, async (req, res, next) => {
  try {
    const items = await query(
      "SELECT id, user_id, session_id, role_user, role_assistant, created_at FROM coach_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 200",
      [req.user.id]
    );
    return res.json(items);
  } catch (err) {
    next(err);
  }
});

// ---------- Body Scan ----------
// POST /api/body-scan
router.post("/body-scan", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      front_b64: { type: "string", required: true },
      side_b64: { type: "string", default: null },
      back_b64: { type: "string", default: null },
      mime_type: { type: "string", default: "image/jpeg" },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const images = [{ base64: b.front_b64, mimeType: b.mime_type }];
    if (b.side_b64) images.push({ base64: b.side_b64, mimeType: b.mime_type });
    if (b.back_b64) images.push({ base64: b.back_b64, mimeType: b.mime_type });
    const p = req.user.profile || {};
    const system =
      "You are a body composition analyst. Estimate from photos. " +
      'Respond ONLY JSON: {"body_fat_estimate":0,"muscle_development":"low|moderate|high","posture":"","symmetry":"","focus_areas":["..."],"recommendations":["..."],"overall_score":0}';
    const prompt = `User weight ${p.weight_kg || "?"} kg, height ${p.height_cm || "?"} cm, goal ${p.goal || "?"}. Analyze.`;
    const result = await llmJson(system, prompt, images);
    await pool.execute(
      "INSERT INTO body_scans (id, user_id, result, created_at) VALUES (?, ?, ?, ?)",
      [newId(), req.user.id, JSON.stringify(result), nowIso()]
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------- Progress ----------
// POST /api/progress
router.post("/progress", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      weight_kg: { type: "number", required: true },
      body_fat: { type: "number", default: null },
      waist_cm: { type: "number", default: null },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const doc = { ...b, id: newId(), user_id: req.user.id, date: today(), created_at: nowIso() };
    await pool.execute(
      "INSERT INTO progress (id, user_id, weight_kg, body_fat, waist_cm, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [doc.id, doc.user_id, b.weight_kg, b.body_fat, b.waist_cm, doc.date, doc.created_at]
    );
    await pool.execute("UPDATE users SET xp = xp + 15 WHERE id = ?", [req.user.id]);
    return res.json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/progress
router.get("/progress", getCurrentUser, async (req, res, next) => {
  try {
    const items = await query(
      "SELECT id, user_id, weight_kg, body_fat, waist_cm, date, created_at FROM progress WHERE user_id = ? ORDER BY date ASC LIMIT 365",
      [req.user.id]
    );
    return res.json(items);
  } catch (err) {
    next(err);
  }
});

// ---------- Form Correction ----------
// POST /api/form/feedback
router.post("/form/feedback", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      exercise: { type: "string", required: true },
      reps: { type: "int", default: 0 },
      issues: { type: "array", default: [] },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const system =
      "You are a strength coach giving rapid form cues. " +
      'Respond ONLY JSON: {"score":0,"cues":["..."],"top_fix":""}';
    const prompt = `Exercise: ${b.exercise}. Reps observed: ${b.reps}. Detected issues: ${
      b.issues.length ? b.issues.join(", ") : "none"
    }. Give cues.`;
    const result = await llmJson(system, prompt);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------- Workout Sessions ----------
// POST /api/sessions
router.post("/sessions", getCurrentUser, async (req, res, next) => {
  try {
    const v = validate(req.body, {
      exercise: { type: "string", required: true },
      reps: { type: "int", required: true },
      duration_sec: { type: "int", required: true },
      avg_form_score: { type: "int", required: true },
      calories: { type: "number", required: true },
    });
    if (!v.ok) return res.status(422).json({ detail: v.error });
    const b = v.value;
    const doc = { ...b, id: newId(), user_id: req.user.id, date: today(), created_at: nowIso() };
    await pool.execute(
      "INSERT INTO sessions (id, user_id, exercise, reps, duration_sec, avg_form_score, calories, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [doc.id, doc.user_id, b.exercise, b.reps, b.duration_sec, b.avg_form_score, b.calories, doc.date, doc.created_at]
    );
    await pool.execute("UPDATE users SET xp = xp + 20 WHERE id = ?", [req.user.id]);
    return res.json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions
router.get("/sessions", getCurrentUser, async (req, res, next) => {
  try {
    const items = await query(
      "SELECT id, user_id, exercise, reps, duration_sec, avg_form_score, calories, date, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    return res.json(items);
  } catch (err) {
    next(err);
  }
});

// ---------- Stats / Dashboard ----------
// GET /api/stats/dashboard
router.get("/stats/dashboard", getCurrentUser, async (req, res, next) => {
  try {
    const p = req.user.profile || {};
    // inline meals_today logic
    const items = await query(
      "SELECT id, user_id, name, calories, protein, carbs, fats, fiber, sugar, meal_type, date, created_at FROM meals WHERE user_id = ? AND date = ?",
      [req.user.id, today()]
    );
    const totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0 };
    for (const m of items) for (const k of Object.keys(totals)) totals[k] += m[k] || 0;
    const water = await query(
      "SELECT glasses FROM water WHERE user_id = ? AND date = ?",
      [req.user.id, today()]
    );
    const todayData = {
      meals: items,
      totals,
      water_glasses: water.length ? water[0].glasses : 0,
    };
    return res.json({
      user: {
        name: req.user.name,
        xp: req.user.xp || 0,
        streak: req.user.streak || 0,
        level: req.user.level || 1,
        tier: req.user.tier || "free",
      },
      profile: p,
      today: todayData,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "bitfits", time: nowIso() });
});

export default router;
